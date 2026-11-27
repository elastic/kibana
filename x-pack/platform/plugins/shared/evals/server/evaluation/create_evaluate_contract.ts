/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import {
  EvaluateRequestBody,
  EvidenceRound,
  MAX_MULTI_TURN_TRACES,
  type EvaluateRequestBodyInput,
  type EvaluateResult,
} from '@kbn/evals-common';
import { lazySchema, z } from '@kbn/zod/v4';
import { EvaluationExecutionError } from './evaluation_execution_error';
import type { EvaluationService } from './evaluation_service';

/** A round the caller already holds, so no trace is polled or read. */
export interface EvaluateEvidence {
  /** The round in the normalized shape evaluators read: user input, tool calls, response. */
  round: z.input<typeof EvidenceRound>;
  /**
   * Every turn of the conversation, in order, when `round` is its last turn. Conversation-scoped
   * evaluators (such as judges with `transcript` evidence) read it.
   */
  conversation?: {
    rounds: Array<z.input<typeof EvidenceRound>>;
    turn_ids?: Array<string | undefined>;
  };
  /**
   * Everything else the selected evaluators read, as `reference_data` is on a trace subject:
   * ground truth, or other inputs such as a transcript or a decision tree. Each evaluator's
   * `referenceDataSchema` declares what it reads.
   */
  reference_data?: Record<string, unknown>;
}

interface EvaluateBaseParams {
  /** Judges call their connector, and any trace is read, on behalf of this request. */
  request: KibanaRequest;
  /**
   * Space the evaluators are resolved in. Defaults to the request's space. Pass it when the
   * request doesn't carry the caller's space, as a workflow step's fake request doesn't
   * (https://github.com/elastic/kibana/issues/284786).
   */
  spaceId?: string;
  evaluators: EvaluateRequestBodyInput['evaluators'];
}

/**
 * Grades either a trace (`subject`), polled until it has finished exporting, or a round passed
 * in memory (`evidence`). Evaluators that read the trace, such as `latency`, fail on evidence.
 */
export type EvaluateParams = EvaluateBaseParams &
  (
    | { subject: EvaluateRequestBodyInput['subject']; evidence?: never }
    | { evidence: EvaluateEvidence; subject?: never }
  );

export type EvaluateFn = (params: EvaluateParams) => Promise<EvaluateResult[]>;

interface EvaluateContractDependencies {
  evaluationService: EvaluationService;
  getSpaceId: (request: KibanaRequest) => string;
  getTraceReader: (request: KibanaRequest) => ElasticsearchClient;
}

const EvaluateEvidenceInput = lazySchema(() =>
  z.object({
    evaluators: EvaluateRequestBody.shape.evaluators,
    evidence: z.object({
      round: EvidenceRound,
      conversation: z
        .object({
          rounds: z.array(EvidenceRound).min(1).max(MAX_MULTI_TURN_TRACES),
          turn_ids: z.array(z.string().max(256).optional()).max(MAX_MULTI_TURN_TRACES).optional(),
        })
        .optional(),
      reference_data: z.object({}).catchall(z.unknown()).optional(),
    }),
  })
);

const parseOrThrow = <T>(result: z.ZodSafeParseResult<T>): T => {
  if (!result.success) {
    throw new EvaluationExecutionError(
      `Invalid evaluation input: ${z.prettifyError(result.error)}`,
      'badRequest'
    );
  }
  return result.data;
};

/**
 * The start contract's `evaluate()`. In-process callers skip route validation, so their
 * input is held to the same bounds as an `_evaluate` request body here.
 */
export const createEvaluateContract =
  ({ evaluationService, getSpaceId, getTraceReader }: EvaluateContractDependencies): EvaluateFn =>
  async (params) => {
    const { request } = params;
    if (params.evidence && params.subject) {
      throw new EvaluationExecutionError(
        'Invalid evaluation input: pass either subject or evidence, not both',
        'badRequest'
      );
    }
    const spaceId = params.spaceId ?? getSpaceId(request);

    if (params.evidence) {
      const { evaluators, evidence } = parseOrThrow(
        EvaluateEvidenceInput.safeParse({
          evaluators: params.evaluators,
          evidence: params.evidence,
        })
      );
      return evaluationService.evaluate({
        request,
        spaceId,
        evaluators,
        evidence: {
          round: evidence.round,
          ...(evidence.conversation
            ? {
                conversation: {
                  rounds: evidence.conversation.rounds,
                  turnIds:
                    evidence.conversation.turn_ids ??
                    evidence.conversation.rounds.map(() => undefined),
                },
              }
            : {}),
          referenceData: evidence.reference_data,
        },
      });
    }

    const { subject, evaluators } = parseOrThrow(
      EvaluateRequestBody.safeParse({ subject: params.subject, evaluators: params.evaluators })
    );
    return evaluationService.evaluate({
      request,
      spaceId,
      subject,
      evaluators,
      traceReader: getTraceReader(request),
    });
  };
