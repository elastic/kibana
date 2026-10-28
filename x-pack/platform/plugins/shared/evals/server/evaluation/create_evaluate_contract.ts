/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import {
  EvaluateRequestBody,
  type EvaluateRequestBodyInput,
  type EvaluateResult,
} from '@kbn/evals-common';
import { z } from '@kbn/zod/v4';
import { EvaluationExecutionError } from './evaluation_execution_error';
import type { EvaluationService } from './evaluation_service';

export interface EvaluateParams {
  /** Judges call their connector, and traces are read, on behalf of this request. */
  request: KibanaRequest;
  /**
   * Space the evaluators are resolved in. Defaults to the request's space. Pass it when the
   * request doesn't carry the caller's space, as a workflow step's fake request doesn't
   * (https://github.com/elastic/kibana/issues/284786).
   */
  spaceId?: string;
  subject: EvaluateRequestBodyInput['subject'];
  evaluators: EvaluateRequestBodyInput['evaluators'];
}

export type EvaluateFn = (params: EvaluateParams) => Promise<EvaluateResult[]>;

interface EvaluateContractDependencies {
  evaluationService: EvaluationService;
  getSpaceId: (request: KibanaRequest) => string;
  getTraceReader: (request: KibanaRequest) => ElasticsearchClient;
}

/**
 * The start contract's `evaluate()`. In-process callers skip route validation, so their
 * input is held to the same bounds as an `_evaluate` request body here.
 */
export const createEvaluateContract =
  ({ evaluationService, getSpaceId, getTraceReader }: EvaluateContractDependencies): EvaluateFn =>
  async ({ request, spaceId, subject, evaluators }) => {
    const parsed = EvaluateRequestBody.safeParse({ subject, evaluators });
    if (!parsed.success) {
      throw new EvaluationExecutionError(
        `Invalid evaluation input: ${z.prettifyError(parsed.error)}`,
        'badRequest'
      );
    }

    return evaluationService.evaluate({
      request,
      spaceId: spaceId ?? getSpaceId(request),
      subject: parsed.data.subject,
      evaluators: parsed.data.evaluators,
      traceReader: getTraceReader(request),
    });
  };
