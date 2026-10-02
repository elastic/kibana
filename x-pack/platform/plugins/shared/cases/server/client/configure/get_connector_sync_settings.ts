/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server';
import type { ConnectorSyncSettings } from '../../../common/types/domain';
import { createCaseError } from '../../common/error';
import type { CasesClientArgs } from '..';

/**
 * Sync defaults and field rules saved for one connector. Empty when the connector has
 * never been configured, in which case callers fall back to the built-in defaults.
 */
export const getConnectorSyncSettings = async (
  { connectorId }: { connectorId: string },
  clientArgs: CasesClientArgs
): Promise<ConnectorSyncSettings> => {
  const {
    unsecuredSavedObjectsClient,
    services: { connectorMappingsService },
    logger,
  } = clientArgs;

  try {
    const res = await connectorMappingsService.find({
      unsecuredSavedObjectsClient,
      options: {
        perPage: 1,
        hasReference: { type: ACTION_SAVED_OBJECT_TYPE, id: connectorId },
      },
    });

    const attributes = res.saved_objects[0]?.attributes;

    return {
      ...(attributes?.externalSync != null ? { externalSync: attributes.externalSync } : {}),
      ...(attributes?.externalSyncFields != null
        ? { externalSyncFields: attributes.externalSyncFields }
        : {}),
    };
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve sync settings for connector id: ${connectorId}: ${error}`,
      error,
      logger,
    });
  }
};
