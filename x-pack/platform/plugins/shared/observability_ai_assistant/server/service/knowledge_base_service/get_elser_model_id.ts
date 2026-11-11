/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { firstValueFrom } from 'rxjs';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../../types';

export async function getElserModelId({
  core,
  logger,
}: {
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  logger: Logger;
}) {
  const defaultModelId = '.elser_model_2';
  const [coreStart, pluginsStart] = await core.getStartServices();

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
          soClient: SavedObjectsClientContract
        ) => { getELSER: () => Promise<{ model_id: string }> };
      };
    }>('ml');

    if (!ml.found) {
      throw new Error('Could not find ML plugin');
    }

    // fake request => internal user; ML scopes a ui settings client to the saved objects client
    const elserModelDefinition = await ml.contract
      .trainedModelsProvider({}, coreStart.savedObjects.createInternalRepository())
      .getELSER();

    return elserModelDefinition.model_id;
  } catch (error) {
    logger.error(`Failed to resolve ELSER model definition: ${error}`);
    return defaultModelId;
  }
}
