/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * The five grading templates below are copied verbatim from the LongMemEval reference
 * evaluator at revision 9e0b455f4ef0e2ab8f2e582289761153549043fc:
 * https://github.com/xiaowu0162/LongMemEval/blob/9e0b455f4ef0e2ab8f2e582289761153549043fc/src/evaluation/evaluate_qa.py
 *
 * LongMemEval is MIT licensed:
 * Copyright (c) 2024 Di Wu
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to the following
 * conditions: The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { EvalConnector, Evaluator, EvaluationResult } from '@kbn/evals';
import { buildModelFromConnector } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import { EVALUATOR_NAME, EVALUATOR_VERSION, JUDGE_TRANSPORT_VERSION } from './constants';
import type { LongMemEvalExample } from './dataset';
import { LONGMEMEVAL_QUESTION_TYPES } from './dataset';
import type { LongMemEvalTaskOutput } from './task';

type LongMemEvalEvaluator = Evaluator<LongMemEvalExample, LongMemEvalTaskOutput>;
type ScoreModel = NonNullable<ReturnType<NonNullable<Evaluator['getModel']>>>;

export type JudgePromptBranch =
  | 'abstention'
  | 'ordinary'
  | 'temporal'
  | 'knowledge-update'
  | 'preference';

const SYSTEM_PROMPT =
  'Apply the LongMemEval grading instructions in the user message. Return the correctness decision with the longmemeval_judgement tool.';

const ORDINARY_TEMPLATE =
  'I will give you a question, a correct answer, and a response from a model. Please answer yes if the response contains the correct answer. Otherwise, answer no. If the response is equivalent to the correct answer or contains all the intermediate steps to get the correct answer, you should also answer yes. If the response only contains a subset of the information required by the answer, answer no. \n\nQuestion: {}\n\nCorrect Answer: {}\n\nModel Response: {}\n\nIs the model response correct? Answer yes or no only.';
const TEMPORAL_TEMPLATE =
  "I will give you a question, a correct answer, and a response from a model. Please answer yes if the response contains the correct answer. Otherwise, answer no. If the response is equivalent to the correct answer or contains all the intermediate steps to get the correct answer, you should also answer yes. If the response only contains a subset of the information required by the answer, answer no. In addition, do not penalize off-by-one errors for the number of days. If the question asks for the number of days/weeks/months, etc., and the model makes off-by-one errors (e.g., predicting 19 days when the answer is 18), the model's response is still correct. \n\nQuestion: {}\n\nCorrect Answer: {}\n\nModel Response: {}\n\nIs the model response correct? Answer yes or no only.";
const KNOWLEDGE_UPDATE_TEMPLATE =
  'I will give you a question, a correct answer, and a response from a model. Please answer yes if the response contains the correct answer. Otherwise, answer no. If the response contains some previous information along with an updated answer, the response should be considered as correct as long as the updated answer is the required answer.\n\nQuestion: {}\n\nCorrect Answer: {}\n\nModel Response: {}\n\nIs the model response correct? Answer yes or no only.';
const PREFERENCE_TEMPLATE =
  "I will give you a question, a rubric for desired personalized response, and a response from a model. Please answer yes if the response satisfies the desired response. Otherwise, answer no. The model does not need to reflect all the points in the rubric. The response is correct as long as it recalls and utilizes the user's personal information correctly.\n\nQuestion: {}\n\nRubric: {}\n\nModel Response: {}\n\nIs the model response correct? Answer yes or no only.";
const ABSTENTION_TEMPLATE =
  'I will give you an unanswerable question, an explanation, and a response from a model. Please answer yes if the model correctly identifies the question as unanswerable. The model could say that the information is incomplete, or some other information is given but the asked information is not.\n\nQuestion: {}\n\nExplanation: {}\n\nModel Response: {}\n\nDoes the model correctly identify the question as unanswerable? Answer yes or no only.';

const TEMPLATES: Record<JudgePromptBranch, string> = {
  abstention: ABSTENTION_TEMPLATE,
  ordinary: ORDINARY_TEMPLATE,
  temporal: TEMPORAL_TEMPLATE,
  'knowledge-update': KNOWLEDGE_UPDATE_TEMPLATE,
  preference: PREFERENCE_TEMPLATE,
};

const JUDGE_TOOL_NAME = 'longmemeval_judgement';
const JUDGE_ATTEMPTS = 3;

/** Selects the upstream prompt branch: abstention first, then question type. */
export const selectJudgeBranch = ({
  questionType,
  abstention,
}: {
  questionType: string;
  abstention: boolean;
}): JudgePromptBranch => {
  if (!(LONGMEMEVAL_QUESTION_TYPES as readonly string[]).includes(questionType)) {
    throw new Error(`Unsupported LongMemEval question type: ${JSON.stringify(questionType)}.`);
  }
  if (abstention) {
    return 'abstention';
  }
  switch (questionType) {
    case 'temporal-reasoning':
      return 'temporal';
    case 'knowledge-update':
      return 'knowledge-update';
    case 'single-session-preference':
      return 'preference';
    default:
      return 'ordinary';
  }
};

/** Renders the upstream `evaluate_qa.py` prompt; Python `str.format` positional `{}` slots. */
export const buildJudgePrompt = ({
  branch,
  question,
  answer,
  response,
}: {
  branch: JudgePromptBranch;
  question: string;
  answer: string;
  response: string;
}): string => {
  const values = [question, answer, response];
  let slot = 0;
  return TEMPLATES[branch].replace(/\{\}/g, () => values[slot++]);
};

const unscored = (explanation: string, metadata?: Record<string, unknown>): EvaluationResult => ({
  score: null,
  label: 'error',
  explanation,
  ...(metadata ? { metadata } : {}),
});

const toScoreModel = (connector: EvalConnector): ScoreModel | undefined => {
  const { id, family, provider } = buildModelFromConnector(connector);
  return id ? { id, ...(family && { family }), ...(provider && { provider }) } : undefined;
};

/** LongMemEval task-aware answer accuracy judge, bound to the evaluation connector. */
export const createLongMemEvalAnswerAccuracyEvaluator = ({
  inferenceClient,
  evaluationConnector,
  log,
}: {
  inferenceClient: Pick<BoundInferenceClient, 'chatComplete'>;
  evaluationConnector: EvalConnector;
  log: ToolingLog;
}): LongMemEvalEvaluator => {
  const model = toScoreModel(evaluationConnector);

  return {
    name: EVALUATOR_NAME,
    kind: 'LLM',
    direction: 'maximize',
    getModel: () => model,
    getVersion: () => EVALUATOR_VERSION,
    evaluate: async ({ input, output, expected, metadata }) => {
      if (output.taskStatus !== 'ok' || !output.finalResponse) {
        return unscored(`Task produced no answer (${output.errorCode ?? 'unknown'}); not judged.`);
      }
      if (metadata.abstention !== metadata.externalId.endsWith('_abs')) {
        return unscored('Abstention flag does not match the example ID suffix.');
      }

      let branch: JudgePromptBranch;
      try {
        branch = selectJudgeBranch(metadata);
      } catch (error) {
        return unscored(error instanceof Error ? error.message : String(error));
      }

      const prompt = buildJudgePrompt({
        branch,
        question: input.question,
        answer: expected.expected,
        response: output.finalResponse,
      });
      const resultMetadata = {
        promptBranch: branch,
        evaluatorVersion: EVALUATOR_VERSION,
        transportVersion: JUDGE_TRANSPORT_VERSION,
        judgeConnectorId: evaluationConnector.id,
        temperature: 0,
      };

      for (let attempt = 1; attempt <= JUDGE_ATTEMPTS; attempt++) {
        try {
          const response = await inferenceClient.chatComplete({
            system: SYSTEM_PROMPT,
            messages: [{ role: MessageRole.User, content: prompt }],
            tools: {
              [JUDGE_TOOL_NAME]: {
                description: 'Record whether the model response is correct.',
                schema: {
                  type: 'object',
                  properties: { correct: { type: 'boolean' } },
                  required: ['correct'],
                } as const,
              },
            },
            toolChoice: { function: JUDGE_TOOL_NAME },
            temperature: 0,
          });
          const args: unknown = response.toolCalls[0]?.function.arguments;
          const correct =
            typeof args === 'object' && args !== null && 'correct' in args
              ? args.correct
              : undefined;
          if (typeof correct !== 'boolean') {
            throw new Error('Judge did not return a boolean `correct` tool argument.');
          }
          return {
            score: correct ? 1 : 0,
            label: correct ? 'correct' : 'incorrect',
            explanation: 'LongMemEval task-specific judge decision.',
            metadata: resultMetadata,
          };
        } catch (error) {
          log.warning(`[${EVALUATOR_NAME}] judge attempt ${attempt} failed: ${String(error)}`);
        }
      }
      return unscored(`Judge failed after ${JUDGE_ATTEMPTS} attempts.`, resultMetadata);
    },
  };
};

/** Informational: share of evidence sessions that any tool call returned. */
export const createEvidenceSessionRecallEvaluator = (): LongMemEvalEvaluator => ({
  name: 'longmemeval-evidence-session-recall',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, metadata }) => {
    const { evidenceSessionIds } = metadata;
    if (!output.toolEvidence || evidenceSessionIds.length === 0) {
      return { score: null, label: 'unavailable' };
    }
    const retrieved = new Set(output.toolEvidence.retrievedSessionIds);
    const found = evidenceSessionIds.filter((id) => retrieved.has(id)).length;
    return {
      score: found / evidenceSessionIds.length,
      label: `${found}/${evidenceSessionIds.length}`,
    };
  },
});

/** Informational: whether the agent used an ES|QL-based tool (the RFC's named access path). */
export const createUsedEsqlEvaluator = (): LongMemEvalEvaluator => ({
  name: 'longmemeval-used-esql',
  kind: 'CODE',
  direction: 'neutral',
  evaluate: async ({ output }) =>
    output.toolEvidence
      ? { score: output.toolEvidence.usedEsql ? 1 : 0, label: String(output.toolEvidence.usedEsql) }
      : { score: null, label: 'unavailable' },
});
