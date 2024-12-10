/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IClusterClient, Logger } from '@kbn/core/server';
import { storeTypeDefinition } from './type_definition';
import { storeSourceDefinition } from './source_definition';
import { builtInDefinitions } from './built_in';

export async function installBuiltInDefinitions(clusterClient: IClusterClient, logger: Logger) {
  logger.info('Installing built in entity definitions');

  for (const definition of builtInDefinitions) {
    const { type, sources } = definition;

    try {
      await storeTypeDefinition({
        type,
        clusterClient,
        logger,
        replace: true,
      });
    } catch (error) {
      logger.error(error.message);
    }

    for (const source of sources) {
      try {
        await storeSourceDefinition({
          source,
          clusterClient,
          logger,
          replace: true,
        });
      } catch (error) {
        // This may fail because the type installation failed and storeSourceDefinition verifies that the type exists first
        // It may also fail for other reasons but we continue in case there are more sources for the same type that might succeed
        logger.error(error.message);
      }
    }
  }

  logger.info(`Installed ${builtInDefinitions.length} entity definition(s)`);
}
