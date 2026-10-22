/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS,
  type EvaluateResult,
  type EvaluateResultScore,
} from '@kbn/evals-common';
import type { Attributes } from '@opentelemetry/api';

interface EvaluationEventAttributesOptions {
  monitor: {
    id: string;
    name: string;
  };
  spaceId: string;
  connectorId?: string;
  result: EvaluateResult;
  score: EvaluateResultScore;
}

export const toEvaluationEventAttributes = ({
  monitor,
  spaceId,
  connectorId,
  result,
  score,
}: EvaluationEventAttributesOptions): Attributes => {
  const { evaluator } = result;
  const attributes: Attributes = {
    [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATION_NAME]: score.name,
    [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.MONITOR_ID]: monitor.id,
    [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.MONITOR_NAME]: monitor.name,
    [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.SPACE_ID]: spaceId,
    [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATOR_NAME]: evaluator.name,
    [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATOR_VERSION]: evaluator.version,
    [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATOR_KIND]: evaluator.kind,
  };

  if (score.score != null) {
    attributes[EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.SCORE_VALUE] = score.score;
  }
  if (score.label != null) {
    attributes[EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.SCORE_LABEL] = score.label;
  }
  if (score.explanation != null) {
    attributes[EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EXPLANATION] = score.explanation;
  }
  if (connectorId != null) {
    attributes[EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.CONNECTOR_ID] = connectorId;
  }
  if (evaluator.direction != null) {
    attributes[EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATOR_DIRECTION] = evaluator.direction;
  }
  if (evaluator.model != null) {
    attributes[EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATOR_MODEL_ID] = evaluator.model.id;
    if (evaluator.model.family != null) {
      attributes[EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATOR_MODEL_FAMILY] =
        evaluator.model.family;
    }
    if (evaluator.model.provider != null) {
      attributes[EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATOR_MODEL_PROVIDER] =
        evaluator.model.provider;
    }
  }
  if (evaluator.trace_id != null) {
    attributes[EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATOR_TRACE_ID] = evaluator.trace_id;
  }
  if (score.metadata != null) {
    attributes[EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.SCORE_METADATA] = JSON.stringify(
      score.metadata
    );
  }

  return attributes;
};
