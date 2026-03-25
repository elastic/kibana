/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { MessageRole } from '@kbn/inference-common';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { Insight } from '@kbn/streams-schema';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { TaskContext } from '.';
import { cancellableTask } from '../cancellable_task';
import type { TaskParams } from '../types';
import { getErrorMessage } from '../../streams/errors/parse_error';
import { resolveConnectorId } from '../../../routes/utils/resolve_connector_id';
import type { MemoryQuestionCategory } from '../../memory';
import { MemoryServiceImpl } from '../../memory';
import { sigeventsSynthesisPrompt } from '../../../agent_builder/hooks/memory/sigevents_synthesis_prompt';

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
                  const memoryPath = `architecture/${streamName}/overview`;
                  const spaceId = 'default';

                  const existing = await memory.getByPath({
                    path: memoryPath,
                    space: spaceId,
                  });

                  const indicators = JSON.stringify(streamInsights, null, 2);

                  const prompt = sigeventsSynthesisPrompt({
                    streamName,
                    indicators,
                    existingMemory: existing?.content,
                  });

                  const response = await boundInferenceClient.chatComplete({
                    messages: [{ role: MessageRole.User, content: prompt }],
                  });

                  const synthesized = response.content;

                  if (!synthesized || synthesized.length < 50) {
                    taskLogger.debug(`Skipping empty synthesis for stream ${streamName}`);
                    continue;
                  }

                  const user = 'agent:memory_generation';

                  if (existing) {
                    await memory.update({
                      id: existing.id,
                      content: synthesized,
                      space: spaceId,
                      user,
                      changeSummary: 'Updated architecture overview from discovery insights',
                    });
                  } else {
                    await memory.create({
                      path: memoryPath,
                      title: `${streamName} - Architecture Overview`,
                      content: synthesized,
                      tags: ['architecture', 'auto-generated', streamName],
                      space: spaceId,
                      user,
                    });
                  }

                  taskLogger.debug(`Synthesized memory for stream: ${streamName}`);
                }

                // Second pass: generate open questions about memory quality and gaps
                try {
                  await generateQuestions({
                    memory,
                    inferenceClient: boundInferenceClient,
                    spaceId: 'default',
                    logger: taskLogger,
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
}

const QUESTION_GENERATION_PROMPT = `You are a knowledge base quality analyst. Review the following memory entries and identify issues.

For each issue found, output a JSON object on its own line with these fields:
- "question": A clear question for the user about the issue
- "category": Either "quality" (overlapping entries, contradictions, confusing structure) or "gap" (missing knowledge, incomplete entries, references to unknown concepts)
- "related_entry_ids": Array of entry IDs involved

Only flag genuine issues. If everything looks good, output nothing.

## Memory entries
`;

const generateQuestions = async ({
  memory,
  inferenceClient,
  spaceId,
  logger,
}: GenerateQuestionsParams) => {
  const entries = await memory.listAll({ space: spaceId });
  if (entries.length < 2) {
    // Not enough entries to find quality issues
    return;
  }

  const entrySummaries = entries
    .map(
      (e) =>
        `[${e.id}] ${e.path} — "${e.title}" (${e.content.length} chars, tags: ${e.tags.join(
          ', '
        )}):\n${e.content.substring(0, 500)}`
    )
    .join('\n\n---\n\n');

  const response = await inferenceClient.chatComplete({
    messages: [{ role: MessageRole.User, content: QUESTION_GENERATION_PROMPT + entrySummaries }],
  });

  const responseText = response.content;
  if (!responseText || responseText.trim().length < 10) {
    logger.debug('No quality issues found in memory');
    return;
  }

  const questions = parseQuestions(responseText);
  logger.debug(`Found ${questions.length} quality/gap questions in memory`);

  for (const q of questions) {
    // Validate that referenced entry IDs actually exist
    const validIds = q.related_entry_ids.filter((id) => entries.some((e) => e.id === id));

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

interface ParsedQuestion {
  question: string;
  category: MemoryQuestionCategory;
  related_entry_ids: string[];
}

const parseQuestions = (text: string): ParsedQuestion[] => {
  const results: ParsedQuestion[] = [];

  // Try parsing as JSON array first
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.filter(isValidQuestion);
      }
    }
  } catch {
    // Fall through to line-by-line parsing
  }

  // Try parsing each line as a JSON object
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (isValidQuestion(obj)) {
        results.push(obj);
      }
    } catch {
      // skip unparseable lines
    }
  }

  return results;
};

const isValidQuestion = (obj: unknown): obj is ParsedQuestion =>
  typeof obj === 'object' &&
  obj !== null &&
  typeof (obj as ParsedQuestion).question === 'string' &&
  ((obj as ParsedQuestion).category === 'quality' || (obj as ParsedQuestion).category === 'gap') &&
  Array.isArray((obj as ParsedQuestion).related_entry_ids);

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
