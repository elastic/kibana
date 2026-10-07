/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EffortLevel } from '@kbn/agent-builder-common/model_provider';
import type { ModelProvider } from '@kbn/agent-builder-server';

/**
 * Picks the connector a sub-agent runs on.
 *
 * @param modelProvider - The parent agent's model provider.
 * @param effortLevel - Effort level the parent requested for the sub-agent.
 * @param inferenceFeatureId - Inference feature the sub-agent declares, if any.
 * @returns The connector of the parent's model for `effortLevel`, or `undefined` when the
 * sub-agent declares an inference feature, so that its run resolves the feature instead.
 */
export const selectSubagentConnectorId = async ({
  modelProvider,
  effortLevel,
  inferenceFeatureId,
}: {
  modelProvider: ModelProvider;
  effortLevel: EffortLevel;
  inferenceFeatureId?: string;
}): Promise<string | undefined> => {
  if (inferenceFeatureId !== undefined) {
    return undefined;
  }
  const { connector } = await modelProvider.selectModel({ effortLevel });
  return connector.connectorId;
};
