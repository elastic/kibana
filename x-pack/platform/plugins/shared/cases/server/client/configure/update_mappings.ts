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
import type { UpdateMappingsArgs } from './types';
import { casesConnectors } from '../../connectors';

export const updateMappings = async (
  { connector, mappingId, refresh }: UpdateMappingsArgs,
  clientArgs: CasesClientArgs
): Promise<ConnectorMappingResponse> => {
  const {
    unsecuredSavedObjectsClient,
    services: { connectorMappingsService },
    logger,
  } = clientArgs;

  try {
    const mappings = casesConnectors.get(connector.type)?.getMapping() ?? [];

    const theMapping = await connectorMappingsService.update({
      unsecuredSavedObjectsClient,
      mappingId,
      attributes: {
        mappings,
      },
      references: [
        {
          type: ACTION_SAVED_OBJECT_TYPE,
          name: `associated-${ACTION_SAVED_OBJECT_TYPE}`,
          id: connector.id,
        },
      ],
      refresh,
    });

    const res = {
      id: theMapping.id,
      version: theMapping.version,
      mappings: theMapping.attributes.mappings,
    };

    return decodeOrThrow(ConnectorMappingResponseRt)(res);
  } catch (error) {
    throw createCaseError({
      message: `Failed to create mapping connector id: ${connector.id} type: ${connector.type}: ${error}`,
      error,
      logger,
    });
  }
};
