/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { EvaluateRequestBody, EvaluateResult, EvaluationSubject } from '@kbn/evals-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { Logger } from '@kbn/logging';
import type { EvaluatorRegistry } from '../evaluators/types';
import {
  findDuplicateEvaluatorNames,
  getDuplicateEvaluatorNamesMessage,
} from '../lib/duplicate_evaluator_names';
import { EvaluationExecutionError } from './evaluation_execution_error';
import { executeEvaluators, type ResolvedEvaluator } from './execute_evaluators';

export type EvaluatorSelection = EvaluateRequestBody['evaluators'][number];

export interface EvaluateOptions {
  request: KibanaRequest;
  /** Space the evaluators are resolved in. */
  spaceId: string;
  subject: EvaluationSubject;
  evaluators: EvaluatorSelection[];
  /** Identity the trace and log documents are read under. */
  traceReader: ElasticsearchClient;
}

export interface EvaluationService {
  /**
   * Grades one subject with the selected evaluators. Expects input already validated
   * against `EvaluateRequestBody`.
   */
  evaluate(options: EvaluateOptions): Promise<EvaluateResult[]>;
}

interface EvaluationServiceDependencies {
  evaluatorRegistry: EvaluatorRegistry;
  logger: Logger;
  getInferenceStart?: () => Promise<InferenceServerStart>;
}

/** Creates the evaluation service shared by the `_evaluate` route and the start contract. */
export const createEvaluationService = ({
  evaluatorRegistry,
  logger,
  getInferenceStart,
}: EvaluationServiceDependencies): EvaluationService => ({
  evaluate: async ({ request, spaceId, subject, evaluators, traceReader }) => {
    const duplicateEvaluatorNames = findDuplicateEvaluatorNames(evaluators);
    if (duplicateEvaluatorNames.length > 0) {
      throw new EvaluationExecutionError(
        getDuplicateEvaluatorNamesMessage(duplicateEvaluatorNames),
        'badRequest'
      );
    }

    const scopedRegistry = evaluatorRegistry.asScoped({ spaceId });
    const resolvedEvaluators: ResolvedEvaluator[] = [];
    for (const { name, version, connector_id: connectorId } of evaluators) {
      const definition = await scopedRegistry.get(name, version);
      if (!definition) {
        const message = version
          ? `Evaluator not found: ${name}@${version}`
          : `Evaluator not found: ${name}`;
        throw new EvaluationExecutionError(message, 'badRequest');
      }
      resolvedEvaluators.push({ definition, connectorId });
    }

    return executeEvaluators({
      request,
      subject,
      evaluators: resolvedEvaluators,
      logger,
      getInferenceStart,
      traceReader,
    });
  },
});
