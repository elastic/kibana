/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

export type UnitApiKeyComponentType = 'source' | 'destination';

/** An API key created for a unit component, recorded on the unit's configuration saved object. */
export interface UnitApiKey {
  key_id: string;
  component_type: UnitApiKeyComponentType;
  component_id: string;
  created_at: string;
}

export interface InvalidateApiKeysResult {
  invalidated_api_keys: string[];
  previously_invalidated_api_keys: string[];
  error_count: number;
}

/** Resolves to `null` when the license does not enable security. */
export type InvalidateApiKeysAsInternalUser = (
  ids: string[]
) => Promise<InvalidateApiKeysResult | null>;

interface UnitComponents {
  sources?: Array<{ id?: string }>;
  destinations?: Array<{ id?: string; type?: string }>;
}

/**
 * Creating a local Elasticsearch destination mints and records its key, then saves the unit that
 * adds the destination. The create modal runs both steps back to back, so the user can't pause
 * between them and the gap is one request. (Sources save the unit first and mint afterwards, so
 * their component is already stored.) A save from another tab or user inside that gap would
 * otherwise revoke the new key, and the destination would stop ingesting until its key is
 * regenerated. So a unit save leaves a key younger than this alone unless its component was on the
 * previously stored unit. The period only has to outlast that one request, so it is generous on
 * purpose. Keys of components that are never saved (a tab closed mid-request) are revoked by the
 * first save after it.
 */
export const PENDING_API_KEY_GRACE_PERIOD_MS = 10 * 60 * 1000;

const componentIds = (components: Array<{ id?: string }> | undefined): Set<string> =>
  new Set((components ?? []).flatMap((component) => (component.id ? [component.id] : [])));

const isApiKeyOfUnitComponent = (unit: UnitComponents): ((apiKey: UnitApiKey) => boolean) => {
  const sourceIds = componentIds(unit.sources);
  const destinationIds = componentIds(
    unit.destinations?.filter(({ type }) => type === 'elasticsearch')
  );
  return ({ component_type: componentType, component_id: componentId }) =>
    componentType === 'source' ? sourceIds.has(componentId) : destinationIds.has(componentId);
};

/**
 * Selects stored keys whose source or destination is not on `unit`. Kibana mints destination keys
 * only for local Elasticsearch destinations, so a destination that changed to another type counts
 * as removed. A key whose component was never on `previousUnit` may belong to a component that a
 * concurrent save is about to add, so it is selected only after the grace period.
 */
export const isApiKeyOfRemovedComponent = (
  unit: UnitComponents,
  { previousUnit = {}, now = Date.now() }: { previousUnit?: UnitComponents; now?: number } = {}
): ((apiKey: UnitApiKey) => boolean) => {
  const isOnUnit = isApiKeyOfUnitComponent(unit);
  const wasOnPreviousUnit = isApiKeyOfUnitComponent(previousUnit);
  return (apiKey) =>
    !isOnUnit(apiKey) &&
    // A really removed component loses its key at once. Otherwise wait out the grace period,
    // treating an unparseable `created_at` as expired so the key is not kept forever.
    (wasOnPreviousUnit(apiKey) ||
      !(now - Date.parse(apiKey.created_at) < PENDING_API_KEY_GRACE_PERIOD_MS));
};

/**
 * Invalidates keys by id as the internal user, which may invalidate keys created by any user.
 * Resolves to the ids that are no longer active, and whether some requested keys may remain.
 */
export const invalidateUnitApiKeys = async ({
  ids,
  invalidate,
  logger,
}: {
  ids: string[];
  invalidate: InvalidateApiKeysAsInternalUser;
  logger: Logger;
}): Promise<{ revokedIds: string[]; apiKeysMayRemain: boolean }> => {
  if (ids.length === 0) {
    return { revokedIds: [], apiKeysMayRemain: false };
  }

  try {
    const result = await invalidate(ids);
    // Without security, API keys cannot authenticate, so there is nothing left to revoke.
    if (!result || result.error_count === 0) {
      return { revokedIds: ids, apiKeysMayRemain: false };
    }

    const revoked = new Set([
      ...result.invalidated_api_keys,
      ...result.previously_invalidated_api_keys,
    ]);
    logger.warn(`Failed to invalidate ${result.error_count} Streams component API key(s).`);
    return {
      revokedIds: ids.filter((id) => revoked.has(id)),
      apiKeysMayRemain: true,
    };
  } catch (error) {
    logger.error(`Failed to invalidate Streams component API keys: ${error}`);
    return { revokedIds: [], apiKeysMayRemain: true };
  }
};
