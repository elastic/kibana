/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { CoreSetup } from '@kbn/core-lifecycle-server';
import { firstValueFrom } from 'rxjs';
import { ObservabilityAIAssistantPluginStartDependencies } from '../../types';

export async function getElserModelId({
  core,
  logger,
}: {
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  logger: Logger;
}) {
  const defaultModelId = '.elser_model_2';
  const [_, pluginsStart] = await core.getStartServices();

  // Wait for the license to be available so the ML plugin's guards pass once we ask for ELSER stats
  const license = await firstValueFrom(pluginsStart.licensing.license$);
  if (!license.hasAtLeast('enterprise')) {
    return defaultModelId;
  }

  try {
    // Wait for the ML plugin's dependency on the internal saved objects client to be ready
    const { ml } = await core.plugins.onSetup<{
      ml: {
        trainedModelsProvider: (
          request: {},
          soClient: {}
        ) => { getELSER: () => Promise<{ model_id: string }> };
      };
    }>('ml');

    if (!ml.found) {
      throw new Error('Could not find ML plugin');
    }

    const elserModelDefinition = await ml.contract
      .trainedModelsProvider({} as any, {} as any) // request, savedObjectsClient (but we fake it to use the internal user)
      .getELSER();

    return elserModelDefinition.model_id;
  } catch (error) {
    logger.error(`Failed to resolve ELSER model definition: ${error}`);
    return defaultModelId;
  }
}
