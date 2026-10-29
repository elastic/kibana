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
import {
  executeEvaluators,
  type InMemoryEvidence,
  type ResolvedEvaluator,
} from './execute_evaluators';

export type EvaluatorSelection = EvaluateRequestBody['evaluators'][number];

interface EvaluateBaseOptions {
  request: KibanaRequest;
  /** Space the evaluators are resolved in. */
  spaceId: string;
  evaluators: EvaluatorSelection[];
}

interface EvaluateTraceOptions extends EvaluateBaseOptions {
  subject: EvaluationSubject;
  /** Identity the trace and log documents are read under. */
  traceReader: ElasticsearchClient;
  evidence?: never;
}

interface EvaluateEvidenceOptions extends EvaluateBaseOptions {
  evidence: InMemoryEvidence;
  subject?: never;
  traceReader?: never;
}

export type EvaluateOptions = EvaluateTraceOptions | EvaluateEvidenceOptions;

export interface EvaluationService {
  /**
   * Grades a trace, or a round passed in memory, with the selected evaluators. Expects input
   * already validated.
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
  evaluate: async (options) => {
    const { request, spaceId, evaluators } = options;
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

    const baseOptions = { request, evaluators: resolvedEvaluators, logger, getInferenceStart };
    return options.evidence
      ? executeEvaluators({ ...baseOptions, evidence: options.evidence })
      : executeEvaluators({
          ...baseOptions,
          subject: options.subject,
          traceReader: options.traceReader,
        });
  },
});
