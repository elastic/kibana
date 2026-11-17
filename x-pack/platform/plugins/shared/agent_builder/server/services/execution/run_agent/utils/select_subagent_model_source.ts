/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EffortLevel } from '@kbn/agent-builder-common/model_provider';
import type { ModelProvider, ModelSource } from '@kbn/agent-builder-server';

/**
 * Picks the model source a sub-agent runs on.
 *
 * @param modelProvider - The parent agent's model provider.
 * @param parentModel - The source the parent run was asked to run on, if any.
 * @param effortLevel - Effort level the parent requested for the sub-agent.
 * @param inferenceFeatureId - Inference feature the sub-agent declares, if any.
 * @returns `undefined` when the sub-agent declares its own inference feature (its run resolves
 * that feature); the fast model's connector for `low` effort when one is configured; otherwise
 * the parent's source as is, falling back to the connector of the parent's model for `effortLevel`.
 */
export const selectSubagentModelSource = async ({
  modelProvider,
  parentModel,
  effortLevel,
  inferenceFeatureId,
}: {
  modelProvider: ModelProvider;
  parentModel?: ModelSource;
  effortLevel: EffortLevel;
  inferenceFeatureId?: string;
}): Promise<ModelSource | undefined> => {
  if (inferenceFeatureId !== undefined) {
    return undefined;
  }

  const selectedConnectorSource = async (): Promise<ModelSource> => {
    const { connector } = await modelProvider.selectModel({ effortLevel });
    return { connectorId: connector.connectorId };
  };

  if (effortLevel === 'low' && (await modelProvider.hasFastModel())) {
    return selectedConnectorSource();
  }

  return parentModel ?? selectedConnectorSource();
};
