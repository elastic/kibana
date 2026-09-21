/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInferenceEndpointId, type EvaluationWorkerFixtures } from '@kbn/evals';
import { getConnectorModel, type InferenceClient } from '@kbn/inference-common';

/** Reads the judge model from its runtime inference connector. */
export const getJudgeModel = async (
  client: Pick<InferenceClient, 'getConnectorById'>,
  connector: EvaluationWorkerFixtures['evaluationConnector']
): Promise<string> => {
  // REST discovery deduplicates .inference aliases in favor of their endpoint IDs.
  const resolved = await client.getConnectorById(
    getInferenceEndpointId(connector) ?? connector.id
  );
  return getConnectorModel(resolved) ?? connector.name;
};
