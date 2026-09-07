/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import { EngineDescriptorClient, EngineDescriptorTypeName } from '../domain/saved_objects';

/**
 * Returns true when Entity Store has no engine descriptors in the namespace
 * (uninstalled, or space deleted and SOs removed via deleteByNamespace).
 *
 * On unexpected errors returns false so transient SO/ES failures do not
 * self-delete a healthy schedule.
 */
export async function shouldDeleteOrphanedEntityStoreTask({
  coreStart,
  namespace,
  logger,
}: {
  coreStart: CoreStart;
  namespace: string | undefined;
  logger: Logger;
}): Promise<boolean> {
  if (!namespace) {
    return false;
  }

  try {
    const soClient = coreStart.savedObjects.createInternalRepository([EngineDescriptorTypeName]);
    const engines = await new EngineDescriptorClient(soClient, namespace, logger).getAll();
    if (engines.length === 0) {
      logger.info(`Entity store is not installed in namespace "${namespace}"`);
      return true;
    }
    return false;
  } catch (error) {
    logger.warn(`Could not determine entity store install state for namespace "${namespace}"`, {
      error,
    });
    return false;
  }
}
