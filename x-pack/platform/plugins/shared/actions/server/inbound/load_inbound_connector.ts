/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { normalizeConnectorTypeId } from '@kbn/connector-specs';

import { ACTION_SAVED_OBJECT_TYPE } from '../constants/saved_objects';
import type { InMemoryConnector, RawAction } from '../types';

export interface LoadedInboundConnector {
  connectorId: string;
  connectorTypeId: string;
  spaceId: string;
  config: Record<string, unknown>;
}

/**
 * Loads an inbound connector by id in the request space.
 */
export async function loadInboundConnector({
  connectorId,
  connectorTypeId,
  spaceId,
  unsecuredSavedObjectsClient,
  inMemoryConnectors,
  logger,
}: {
  connectorId: string;
  connectorTypeId: string;
  spaceId: string;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  inMemoryConnectors: InMemoryConnector[];
  logger: Logger;
}): Promise<LoadedInboundConnector | undefined> {
  const normalizedTypeId = normalizeConnectorTypeId(connectorTypeId);

  const inMemoryConnector = inMemoryConnectors.find((connector) => connector.id === connectorId);
  let actionTypeId: string | undefined;
  let config: Record<string, unknown> = {};

  if (inMemoryConnector) {
    actionTypeId = inMemoryConnector.actionTypeId;
    config = inMemoryConnector.config ?? {};
  } else {
    try {
      const { attributes } = await unsecuredSavedObjectsClient.get<RawAction>(
        ACTION_SAVED_OBJECT_TYPE,
        connectorId
      );
      actionTypeId = attributes.actionTypeId;
      config = attributes.config ?? {};
    } catch (error) {
      logger.debug(
        `Failed to load inbound connector ${connectorId} space ${spaceId}: ${String(error)}`
      );
      return undefined;
    }
  }

  if (actionTypeId !== normalizedTypeId) {
    logger.debug(
      `Inbound connector ${connectorId} space ${spaceId} type mismatch: expected ${normalizedTypeId}, got ${actionTypeId}`
    );
    return undefined;
  }

  return {
    connectorId,
    connectorTypeId: normalizedTypeId,
    spaceId,
    config,
  };
}
