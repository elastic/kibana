/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import pLimit from 'p-limit';
import { answerAgentOf, destOf, runDirOf } from '../config';
import type { StageContext } from '../context';
import { writeJson } from '../download';
import type { AnswerJudgement } from '../judge';
import {
  ANSWER_SCORES,
  ANSWER_SYSTEM_PROMPT,
  answerJudgePrompt,
  parseAnswerJudgement,
} from '../judge';
import { askJudge, resolveJudgeConnectorId } from '../llm';
import type { Scores } from '../report';
import { describeScore, scoresOf, scoreTables, shortQuestion } from '../report';
import type { EvalTarget } from '../types';
import { targetsOfRun } from '../targets';
import { kiSetsOf } from './evaluate';
import { restoreDreamedKis } from './run';

const DYNAMIC_TOOL = /execute_dynamic_tool$/;

interface ConverseStep {
  type: string;
  tool_id?: string;
  params?: Record<string, unknown>;
}

interface ConverseResponse {
  conversation_id: string;
  steps?: ConverseStep[];
  response?: { message?: string };
}

export interface ToolCallSummary {
  tool: string;
  /** The ES|QL of an AI index query. */
  query?: string;
}

export interface AnswerResult extends AnswerJudgement {
  target: EvalTarget;
  /** The sample whose KIs the agent had, when samples ran one at a time. */
  sample?: string;
  answer: string;
  conversationId?: string;
  toolCalls: ToolCallSummary[];
  durationMs: number;
}

export interface AnswerEvaluation extends Scores {
  runId: string;
  aiIndexId: string;
  agentId: string;
  judgeConnectorId: string;
  askedAt: string;
  results: AnswerResult[];
}

export const answersFileOf = (dir: string): string => path.join(dir, 'answers.json');

/** The tools a round called, with the real tool behind a dynamic tool call. */
export const toolCallsOf = (steps: ConverseStep[] = []): ToolCallSummary[] =>
  steps
    .filter(({ type }) => type === 'tool_call')
    .map(({ tool_id: toolId = '', params = {} }) => {
      const inner = DYNAMIC_TOOL.test(toolId)
        ? (params as { tool_id?: unknown; params?: Record<string, unknown> })
        : undefined;
      const tool = typeof inner?.tool_id === 'string' ? inner.tool_id : toolId;
      const toolParams = inner?.params ?? params;
      return {
        tool,
        ...(typeof toolParams.query === 'string' && { query: toolParams.query }),
      };
    });

/** The question as the agent gets it: with the date it is asked on, when a target has one. */
export const questionFor = ({ question, askedAt }: EvalTarget): string =>
  askedAt ? `(Today is ${askedAt.slice(0, 10)}.) ${question}` : question;

export const answersMarkdown = (evaluation: AnswerEvaluation): string => {
  const wrong = evaluation.results.filter(({ verdict }) => verdict !== 'correct');
  const queries = evaluation.results.map(
    ({ toolCalls }) => toolCalls.filter(({ query }) => query).length
  );
  return [
    `# Dreaming eval answers: ${evaluation.aiIndexId}, run ${evaluation.runId}`,
    '',
    `The agent \`${evaluation.agentId}\` answered each target's question from the AI index; \`${
      evaluation.judgeConnectorId
    }\` judged the answers. Correct counts 1 and partial 0.5. The agent ran ${queries.reduce(
      (sum, count) => sum + count,
      0
    )} AI index queries, ${queries.filter((count) => count === 0).length} answers without one.`,
    '',
    ...scoreTables(evaluation),
    '## Not correct',
    '',
    ...wrong.map(
      ({ target, verdict, answer, reason, toolCalls }) =>
        `- **${verdict}** \`${target.id}\` (${target.category}): ${shortQuestion(
          target
        )} → expected ${target.answer.slice(0, 120)}; answered ${answer
          .replace(/\s+/g, ' ')
          .slice(0, 200)} (${toolCalls.length} tool calls). ${reason}`
    ),
    '',
  ].join('\n');
};

/** Puts a target's question to the agent, and judges its answer. */
const askOne = async (
  context: StageContext,
  agentId: string,
  judgeConnectorId: string,
  target: EvalTarget
): Promise<AnswerResult> => {
  const { config, kibana } = context;
  const started = Date.now();
  let answer = '';
  let conversationId: string | undefined;
  let toolCalls: ToolCallSummary[] = [];
  let judgement: AnswerJudgement;
  try {
    const { data } = await kibana<ConverseResponse>(
      'POST',
      '/api/agent_builder/converse',
      {
        agent_id: agentId,
        input: questionFor(target),
        ...(config.ask.connector_id && { connector_id: config.ask.connector_id }),
      },
      { timeoutMs: config.ask.timeout_minutes * 60_000 }
    );
    answer = data.response?.message ?? '';
    conversationId = data.conversation_id;
    toolCalls = toolCallsOf(data.steps);
    const judged = await askJudge<AnswerJudgement>({
      context,
      connectorId: judgeConnectorId,
      system: ANSWER_SYSTEM_PROMPT,
      prompt: answerJudgePrompt(target, answer),
      parse: (content) => {
        const parsed = parseAnswerJudgement(content);
        return parsed.verdict === 'error' ? { error: parsed.reason } : parsed;
      },
    });
    judgement = 'error' in judged ? { verdict: 'error', reason: judged.error } : judged;
  } catch (error) {
    judgement = {
      verdict: 'error',
      reason: `The agent did not answer: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  return {
    target,
    answer,
    conversationId,
    toolCalls,
    durationMs: Date.now() - started,
    ...judgement,
  };
};

/** Puts each target's question to the AI index's answer agent, and judges the answers. */
export const runAsk = async (context: StageContext): Promise<void> => {
  const { config, esClient, log, runId } = context;
  const judgeConnectorId = await resolveJudgeConnectorId(context);
  const limit = pLimit(config.ask.concurrency);
  for (const aiIndex of config.ai_indices.filter(({ id }) => context.aiIndexIds.includes(id))) {
    if (!aiIndex.answer_agent.enabled) {
      log.info(`${aiIndex.id}: its answer agent is turned off; skipping`);
      continue;
    }
    const agent = answerAgentOf(aiIndex);
    const dir = runDirOf(config, runId, aiIndex.id);
    const sets = kiSetsOf(dir, targetsOfRun(context, aiIndex, dir));
    const total = sets.reduce((sum, { targets }) => sum + targets.length, 0);
    log.info(`${aiIndex.id}: asking ${agent.id} ${total} questions`);
    let done = 0;
    const results: AnswerResult[] = [];
    for (const { sample, kis, targets } of sets) {
      if (targets.length === 0) {
        continue;
      }
      await restoreDreamedKis(esClient, destOf(aiIndex.id), kis, config.space);
      log.info(
        `  restored the ${kis.length} KIs of ${sample ? `sample ${sample}` : `run ${runId}`}`
      );
      results.push(
        ...(await Promise.all(
          targets.map((target) =>
            limit(async (): Promise<AnswerResult> => {
              const result = await askOne(context, agent.id, judgeConnectorId, target);
              done++;
              if (done % 5 === 0 || done === total) {
                log.info(`  ${done}/${total} answered`);
              }
              return { ...result, ...(sample && { sample }) };
            })
          )
        ))
      );
    }

    const evaluation: AnswerEvaluation = {
      runId,
      aiIndexId: aiIndex.id,
      agentId: agent.id,
      judgeConnectorId,
      askedAt: new Date().toISOString(),
      ...scoresOf(results, ANSWER_SCORES),
      results,
    };
    writeJson(answersFileOf(dir), evaluation);
    const summaryFile = path.join(dir, 'answers.md');
    fs.writeFileSync(summaryFile, answersMarkdown(evaluation));
    log.success(
      `${aiIndex.id}: ${agent.id} answered ${describeScore(evaluation.overall)} → ${path.relative(
        process.cwd(),
        summaryFile
      )}`
    );
    for (const [category, line] of Object.entries(evaluation.byCategory)) {
      log.info(`  ${category}: ${describeScore(line)}`);
    }
  }
};
