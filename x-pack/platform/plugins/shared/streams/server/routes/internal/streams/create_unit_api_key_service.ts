/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { StreamsUnitService } from '../../../lib/saved_objects/streams_unit_service';
import { invalidateUnitApiKeys } from '../../../lib/unit_config/unit_api_keys';
import type {
  InvalidateApiKeysAsInternalUser,
  UnitApiKey,
} from '../../../lib/unit_config/unit_api_keys';
import type { RouteHandlerScopedClients } from '../../types';

/** Unit service for routes that record, list and revoke component API keys. */
export const createUnitApiKeyService = ({
  clients: { unitSoClient, canEncrypt, invalidateApiKeysAsInternalUser },
  logger,
}: {
  clients: Pick<
    RouteHandlerScopedClients,
    'unitSoClient' | 'canEncrypt' | 'invalidateApiKeysAsInternalUser'
  >;
  logger: Logger;
}): StreamsUnitService =>
  new StreamsUnitService({
    soClient: unitSoClient,
    logger,
    canEncrypt,
    invalidateApiKeys: invalidateApiKeysAsInternalUser,
  });

/**
 * Records a newly created key on its unit. If that fails the key is invalidated: other users
 * could not revoke a key missing from the registry, so it must not be handed out.
 */
export const recordComponentApiKey = async ({
  unitApiKeyService,
  unitId,
  apiKey,
  invalidate,
  logger,
}: {
  unitApiKeyService: StreamsUnitService;
  unitId: string;
  apiKey: UnitApiKey;
  invalidate: InvalidateApiKeysAsInternalUser;
  logger: Logger;
}): Promise<void> => {
  try {
    await unitApiKeyService.recordApiKey(unitId, apiKey);
  } catch (error) {
    logger.error(`Failed to record Streams ${apiKey.component_type} API key: ${error}`);
    await invalidateUnitApiKeys({ ids: [apiKey.key_id], invalidate, logger });
    throw error;
  }
};
