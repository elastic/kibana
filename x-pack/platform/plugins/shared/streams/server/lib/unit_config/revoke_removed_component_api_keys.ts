/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { STREAMS_DEFAULT_UNIT_ID } from '../../../common/constants';
import { revokeComponentApiKeys } from './managed_api_keys';

interface UnitComponentIds {
  sources?: Array<{ id?: string }>;
  destinations?: Array<{ id?: string }>;
}

const componentIds = (components: Array<{ id?: string }> | undefined): Set<string> =>
  new Set((components ?? []).flatMap((component) => (component.id ? [component.id] : [])));

const removedIds = (previous: Set<string>, next: Set<string>): string[] =>
  [...previous].filter((id) => !next.has(id));

/**
 * After a unit persist succeeds, invalidate API keys for sources and destinations that are no
 * longer on the unit. `client` must be scoped to the current user (see `revokeComponentApiKeys`).
 * Resolves to whether some of those keys may still be active.
 */
export const revokeRemovedComponentApiKeys = async ({
  client,
  logger,
  isSecurityEnabled,
  previousUnit,
  nextUnit,
  unitId = STREAMS_DEFAULT_UNIT_ID,
}: {
  client: ElasticsearchClient;
  logger: Logger;
  isSecurityEnabled: boolean;
  previousUnit?: UnitComponentIds;
  nextUnit: UnitComponentIds;
  unitId?: string;
}): Promise<{ apiKeysMayRemain: boolean }> => {
  if (!isSecurityEnabled || !previousUnit) {
    return { apiKeysMayRemain: false };
  }

  const sourceIds = removedIds(componentIds(previousUnit.sources), componentIds(nextUnit.sources));
  const destinationIds = removedIds(
    componentIds(previousUnit.destinations),
    componentIds(nextUnit.destinations)
  );

  if (sourceIds.length === 0 && destinationIds.length === 0) {
    return { apiKeysMayRemain: false };
  }

  return revokeComponentApiKeys({
    client,
    logger,
    sourceIds,
    destinationIds,
    unitId,
  });
};
