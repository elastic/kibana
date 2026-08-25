/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server';
import type { ConnectorMappingResponse } from '../../../common/types/api';
import { ConnectorMappingResponseRt } from '../../../common/types/api';
import { decodeOrThrow } from '../../common/runtime_types';
import { createCaseError } from '../../common/error';
import type { CasesClientArgs } from '..';
import type { MappingsArgs } from './types';

export const getMappings = async (
  { connector }: MappingsArgs,
  clientArgs: CasesClientArgs
): Promise<ConnectorMappingResponse | null> => {
  const {
    unsecuredSavedObjectsClient,
    services: { connectorMappingsService },
    logger,
  } = clientArgs;

  try {
    const myConnectorMappings = await connectorMappingsService.find({
      unsecuredSavedObjectsClient,
      options: {
        hasReference: {
          type: ACTION_SAVED_OBJECT_TYPE,
          id: connector.id,
        },
      },
    });

    if (myConnectorMappings.saved_objects.length === 0) {
      return null;
    }

    const so = myConnectorMappings.saved_objects[0];

    const res = {
      id: so.id,
      version: so.version,
      mappings: so.attributes.mappings,
    };

    return decodeOrThrow(ConnectorMappingResponseRt)(res);
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve mapping connector id: ${connector.id} type: ${connector.type}: ${error}`,
      error,
      logger,
    });
  }
};
