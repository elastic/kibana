/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationWorkerFixtures } from '@kbn/evals';
import {
  getConnectorModel,
  InferenceConnectorType,
  type InferenceClient,
} from '@kbn/inference-common';

/** Reads the judge model from its runtime inference connector. */
export const getJudgeModel = async (
  client: Pick<InferenceClient, 'getConnectorById'>,
  connector: EvaluationWorkerFixtures['evaluationConnector']
): Promise<string> => {
  const { inferenceId } = connector.config;
  // REST discovery deduplicates .inference aliases in favor of their endpoint IDs.
  const lookupId =
    connector.actionTypeId === InferenceConnectorType.Inference && typeof inferenceId === 'string'
      ? inferenceId
      : connector.id;
  const resolved = await client.getConnectorById(lookupId);
  return getConnectorModel(resolved) ?? connector.name;
};
