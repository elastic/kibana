/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { MessageRole, createPrompt } from '@kbn/inference-common';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { Insight } from '@kbn/streams-schema';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { z } from '@kbn/zod/v4';
import type { TaskContext } from '.';
import { cancellableTask } from '../cancellable_task';
import type { TaskParams } from '../types';
import { getErrorMessage } from '../../streams/errors/parse_error';
import { resolveConnectorId } from '../../../routes/utils/resolve_connector_id';
import type { MemoryQuestionCategory } from '../../memory';
import { MemoryServiceImpl } from '../../memory';
import {
  sigeventsSynthesisPrompt,
  parseSynthesisResponse,
} from '../../../agent_builder/hooks/memory/sigevents_synthesis_prompt';

export interface MemoryGenerationTaskParams {
  insights: Insight[];
}

export interface MemoryGenerationTaskResult {
  streamsProcessed: number;
}

export const MEMORY_GENERATION_TASK_TYPE = 'streams_memory_generation';

export function createStreamsMemoryGenerationTask(taskContext: TaskContext) {
  return {
    [MEMORY_GENERATION_TASK_TYPE]: {
      createTaskRunner: (runContext) => {
        return {
          run: cancellableTask(
            async () => {
              if (!runContext.fakeRequest) {
                throw new Error('Request is required to run this task');
              }

              const { insights, _task } = runContext.taskInstance
                .params as TaskParams<MemoryGenerationTaskParams>;

              const { taskClient, inferenceClient, modelSettingsClient, uiSettingsClient } =
                await taskContext.getScopedClients({
                  request: runContext.fakeRequest,
                });

              const taskLogger = taskContext.logger.get('memory_generation');

              if (!insights || insights.length === 0) {
                taskLogger.debug('No insights provided, skipping memory generation');
                await taskClient.complete<MemoryGenerationTaskParams, MemoryGenerationTaskResult>(
                  _task,
                  { insights },
                  { streamsProcessed: 0 }
                );
                return;
              }

              const settings = await modelSettingsClient.getSettings();
              const connectorId = await resolveConnectorId({
                connectorId: settings.connectorIdDiscovery,
                uiSettingsClient,
                logger: taskLogger,
              });
              taskLogger.debug(`Using connector ${connectorId} for memory generation`);

              const memory = new MemoryServiceImpl({
                logger: taskLogger.get('memory'),
                esClient: taskContext.getInternalEsClient(),
              });

              try {
                const streamGroups = groupInsightsByStream(insights);
                const boundInferenceClient = inferenceClient.bindTo({ connectorId });

                for (const { streamName, streamInsights } of streamGroups) {
                  const spaceId = 'default';

                  // Gather existing entries under this stream's namespace
                  const allEntries = await memory.listAll({ space: spaceId });
                  const existingEntries = allEntries
                    .filter(
                      (e) =>
                        e.path.startsWith(`architecture/${streamName}/`) ||
                        e.path.startsWith(`operations/${streamName}/`)
                    )
                    .map((e) => ({
                      path: e.path,
                      title: e.title,
                      content: e.content,
                    }));

                  const indicators = JSON.stringify(streamInsights, null, 2);

                  const prompt = sigeventsSynthesisPrompt({
                    streamName,
                    indicators,
                    existingEntries: existingEntries.length > 0 ? existingEntries : undefined,
                  });

                  const response = await boundInferenceClient.chatComplete({
                    messages: [{ role: MessageRole.User, content: prompt }],
                  });

                  const synthesized = response.content;

                  if (!synthesized || synthesized.length < 20) {
                    taskLogger.debug(`Skipping empty synthesis for stream ${streamName}`);
                    continue;
                  }

                  const pages = parseSynthesisResponse(synthesized);
                  if (pages.length === 0) {
                    taskLogger.debug(`No valid wiki pages parsed for stream ${streamName}`);
                    continue;
                  }

                  const user = 'agent:memory_generation';

                  for (const page of pages) {
                    const existing = await memory.getByPath({
                      path: page.path,
                      space: spaceId,
                    });

                    if (existing) {
                      await memory.update({
                        id: existing.id,
                        content: page.content,
                        title: page.title,
                        space: spaceId,
                        user,
                        changeSummary: 'Updated from discovery insights',
                      });
                    } else {
                      await memory.create({
                        path: page.path,
                        title: page.title,
                        content: page.content,
                        tags: [...page.tags, 'auto-generated'],
                        space: spaceId,
                        user,
                      });
                    }

                    taskLogger.debug(`Wrote wiki page: ${page.path}`);
                  }

                  taskLogger.info(
                    `Synthesized ${pages.length} wiki pages for stream: ${streamName}`
                  );
                }

                // Second pass: generate open questions about memory quality and gaps
                try {
                  await generateQuestions({
                    memory,
                    inferenceClient: boundInferenceClient,
                    spaceId: 'default',
                    logger: taskLogger,
                    insights,
                  });
                } catch (questionError) {
                  taskLogger.warn(
                    `Question generation failed (non-fatal): ${getErrorMessage(questionError)}`
                  );
                }

                await taskClient.complete<MemoryGenerationTaskParams, MemoryGenerationTaskResult>(
                  _task,
                  { insights },
                  { streamsProcessed: streamGroups.length }
                );
              } catch (error) {
                const errorMessage = getErrorMessage(error);

                if (
                  errorMessage.includes('ERR_CANCELED') ||
                  errorMessage.includes('Request was aborted')
                ) {
                  return getDeleteTaskRunResult();
                }

                taskLogger.error(`Task ${runContext.taskInstance.id} failed: ${errorMessage}`);

                await taskClient.fail<MemoryGenerationTaskParams>(
                  _task,
                  { insights },
                  errorMessage
                );

                return getDeleteTaskRunResult();
              }
            },
            runContext,
            taskContext
          ),
        };
      },
    },
  } satisfies TaskDefinitionRegistry;
}

interface StreamInsightsGroup {
  streamName: string;
  streamInsights: Insight[];
}

interface GenerateQuestionsParams {
  memory: MemoryServiceImpl;
  inferenceClient: BoundInferenceClient;
  spaceId: string;
  logger: TaskContext['logger'];
  insights: Insight[];
}

const questionGenerationPrompt = createPrompt({
  name: 'memory_question_generation',
  input: z.object({
    entry_index: z.string(),
    trigger_context: z.string(),
    existing_questions: z.string(),
  }),
})
  .version({
    system: {
      mustache: {
        template: [
          'You are a knowledge base quality analyst for an observability platform.',
          'Your job is to review memory entries and identify genuine issues that need human input.',
          '',
          'Use the `read_entry` tool to read the full content of individual entries.',
          'You MUST read at least a few entries before submitting questions — do not guess from titles alone.',
          '',
          'Look for:',
          '- **quality** issues: overlapping/contradictory entries, confusing structure, entries that should be merged',
          '- **gap** issues: missing knowledge, incomplete entries, references to unknown concepts or services',
          '',
          'IMPORTANT: Do NOT submit questions that duplicate or overlap with existing open questions (listed below).',
          '',
          'When done, call `submit_questions` with all genuine NEW issues found.',
          'If everything looks good, call `submit_questions` with an empty array.',
        ].join('\n'),
      },
    },
    template: {
      mustache: {
        template: [
          '## Memory entry index',
          '{{entry_index}}',
          '',
          '## Trigger context',
          '{{trigger_context}}',
          '',
          '## Existing open questions (do NOT duplicate these)',
          '{{existing_questions}}',
          '',
          'Read entries that look relevant, cross-reference them, and identify genuine quality or gap issues.',
        ].join('\n'),
      },
    },
    tools: {
      read_entry: {
        description:
          'Read the full content of a memory entry by its ID. Use this to inspect entries before flagging issues.',
        schema: {
          type: 'object' as const,
          properties: {
            entry_id: {
              type: 'string' as const,
              description: 'The ID of the memory entry to read',
            },
          },
          required: ['entry_id'] as const,
        },
      },
      submit_questions: {
        description:
          'Submit the list of identified quality or gap questions. Call this once when done analyzing.',
        schema: {
          type: 'object' as const,
          properties: {
            questions: {
              type: 'array' as const,
              items: {
                type: 'object' as const,
                properties: {
                  question: {
                    type: 'string' as const,
                    description: 'A clear question for the user about the issue',
                  },
                  category: {
                    type: 'string' as const,
                    enum: ['quality', 'gap'],
                    description: 'Either "quality" or "gap"',
                  },
                  related_entry_ids: {
                    type: 'array' as const,
                    items: { type: 'string' as const },
                    description: 'Array of entry IDs involved in this issue',
                  },
                },
                required: ['question', 'category', 'related_entry_ids'] as const,
              },
            },
          },
          required: ['questions'] as const,
        },
      },
    },
  })
  .get();

interface SubmittedQuestion {
  question: string;
  category: MemoryQuestionCategory;
  related_entry_ids: string[];
}

const generateQuestions = async ({
  memory,
  inferenceClient,
  spaceId,
  logger,
  insights,
}: GenerateQuestionsParams) => {
  const entries = await memory.listAll({ space: spaceId });
  if (entries.length < 2) {
    return;
  }

  const entryIndex = entries
    .map((e) => `- [${e.id}] ${e.path} — "${e.title}" (tags: ${e.tags.join(', ')})`)
    .join('\n');

  const triggerContext =
    insights.length > 0
      ? `This review was triggered after discovery found ${insights.length} insight(s):\n${insights
          .map((i) => `- ${i.title ?? i.description ?? 'Untitled insight'}`)
          .join('\n')}`
      : 'This review was triggered after memory synthesis.';

  const existingQuestions = await memory.getOpenQuestions({ space: spaceId, size: 50 });
  const existingQuestionsText =
    existingQuestions.length > 0
      ? existingQuestions.map((q) => `- [${q.category}] ${q.question}`).join('\n')
      : 'None';

  const entryMap = new Map(entries.map((e) => [e.id, e]));

  let submittedQuestions: SubmittedQuestion[] = [];

  await executeAsReasoningAgent({
    inferenceClient,
    prompt: questionGenerationPrompt,
    input: {
      entry_index: entryIndex,
      trigger_context: triggerContext,
      existing_questions: existingQuestionsText,
    },
    maxSteps: 8,
    finalToolChoice: { function: 'submit_questions' },
    toolCallbacks: {
      read_entry: async (toolCall) => {
        const { entry_id: entryId } = toolCall.function.arguments;
        const entry = entryMap.get(entryId);
        if (!entry) {
          return {
            response: { error: `Entry ${entryId} not found` },
          };
        }
        return {
          response: {
            id: entry.id,
            path: entry.path,
            title: entry.title,
            tags: entry.tags,
            content: entry.content,
          },
        };
      },
      submit_questions: async (toolCall) => {
        const { questions } = toolCall.function.arguments;
        submittedQuestions = (questions ?? [])
          .filter(
            (q) =>
              typeof q.question === 'string' &&
              (q.category === 'quality' || q.category === 'gap') &&
              Array.isArray(q.related_entry_ids)
          )
          .map((q) => ({
            question: q.question!,
            category: q.category as MemoryQuestionCategory,
            related_entry_ids: q.related_entry_ids!,
          }));
        return {
          response: { accepted: submittedQuestions.length },
        };
      },
    },
  });

  logger.debug(`Agent submitted ${submittedQuestions.length} quality/gap questions`);

  for (const q of submittedQuestions) {
    const validIds = q.related_entry_ids.filter((id) => entryMap.has(id));

    await memory.createQuestion({
      question: q.question,
      category: q.category,
      relatedEntries: validIds,
      context: 'Auto-generated during memory synthesis after discovery completion',
      space: spaceId,
      user: 'system:memory-generation',
    });
  }
};

const groupInsightsByStream = (insights: Insight[]): StreamInsightsGroup[] => {
  const byStream = new Map<string, Insight[]>();

  for (const insight of insights) {
    const streamNames = new Set<string>();
    for (const evidence of insight.evidence ?? []) {
      if (evidence.stream_name) {
        streamNames.add(evidence.stream_name);
      }
    }

    for (const streamName of streamNames) {
      const existing = byStream.get(streamName) ?? [];
      existing.push(insight);
      byStream.set(streamName, existing);
    }
  }

  return Array.from(byStream.entries()).map(([streamName, streamInsights]) => ({
    streamName,
    streamInsights,
  }));
};
