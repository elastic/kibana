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
import { EntitySourceDefinition, EntityTypeDefinition } from '../types';

export async function installBuiltInDefinitions(clusterClient: IClusterClient, logger: Logger) {
  logger.info('Installing built in entity definitions');

  const types: EntityTypeDefinition[] = [];
  const sources: EntitySourceDefinition[] = [];
  for (const definition of builtInDefinitions) {
    types.push(definition.type);
    sources.push(...definition.sources);
  }

  const typeInstallations = await Promise.allSettled(
    types.map((type) => storeTypeDefinition({ type, clusterClient, logger, replace: true }))
  );

  typeInstallations.forEach((installation) => {
    if (installation.status === 'rejected') {
      logger.error(installation.reason);
    }
  });

  const sourceInstallations = await Promise.allSettled(
    sources.map((source) =>
      storeSourceDefinition({
        source,
        clusterClient,
        logger,
        replace: true,
      })
    )
  );

  // This may fail because the type installation failed and storeSourceDefinition verifies that the type exists first
  // It may also fail for other reasons but we continue in case there are more sources for the same type that might succeed
  sourceInstallations.forEach((installation) => {
    if (installation.status === 'rejected') {
      logger.error(installation.reason);
    }
  });
}
