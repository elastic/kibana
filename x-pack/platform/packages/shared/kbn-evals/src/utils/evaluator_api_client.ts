/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { SomeDevLog } from '@kbn/some-dev-log';
import {
  API_VERSIONS,
  EVALS_EVALUATOR_EVALUATE_URL,
  ExecuteEvaluatorResponse,
  type ExecuteEvaluatorRequestBodyInput,
} from '@kbn/evals-common';
import type { Evaluator, EvaluatorParams, Example, TaskOutput } from '../types';

export type MapContextFn<TOutput = TaskOutput> = (params: EvaluatorParams<Example, TOutput>) => {
  trace_id?: string;
  context?: Record<string, unknown>;
};

const defaultMapContext: MapContextFn = ({ output }) => ({
  trace_id: (output as Record<string, unknown>)?.traceId as string | undefined,
});

const VERSIONED_HEADERS = { 'elastic-api-version': API_VERSIONS.internal.v1 };

const getResponseData = (response: unknown): unknown => {
  if (typeof response === 'object' && response !== null && 'data' in response) {
    return (response as { data: unknown }).data;
  }
  return response;
};

export class EvaluatorApiClient {
  constructor(private readonly kbnClient: KbnClient, private readonly log: SomeDevLog) {}

  async executeEvaluator(
    evaluatorName: string,
    body: ExecuteEvaluatorRequestBodyInput
  ): Promise<ExecuteEvaluatorResponse> {
    const path = EVALS_EVALUATOR_EVALUATE_URL.replace(
      '{evaluatorName}',
      encodeURIComponent(evaluatorName)
    );
    const response = await this.kbnClient.request({
      path,
      method: 'POST',
      body,
      headers: VERSIONED_HEADERS,
    });
    return ExecuteEvaluatorResponse.parse(getResponseData(response));
  }

  toEvaluator(
    evaluatorName: string,
    options: {
      connectorId?: string;
      mapContext?: MapContextFn;
    } = {}
  ): Evaluator {
    const { connectorId, mapContext } = options;

    return {
      name: evaluatorName,
      kind: 'LLM',
      evaluate: async (params) => {
        const mapped = (mapContext ?? defaultMapContext)(params);
        try {
          const result = await this.executeEvaluator(evaluatorName, {
            connector_id: connectorId,
            ...mapped,
          });
          return {
            score: result.score,
            label: result.label,
            explanation: result.explanation,
            metadata: result.metadata,
          };
        } catch (error) {
          this.log.error(`Failed to execute evaluator "${evaluatorName}": ${error}`);
          throw error;
        }
      },
    };
  }
}
