/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceInstance } from '../service_settings_step/use_service_settings';

interface SOSettingsSource {
  integrationName?: string;
  description?: string;
  instances?: ServiceInstance[];
}

/**
 * The service instances as the saved object stores them: only the fields a resume needs to rebuild
 * the Service settings rows. Left out when there are none, so a write never clears a stored list
 * with an empty one.
 */
const toSOInstances = (
  instances: ServiceInstance[] | undefined
): { instances?: ServiceInstance[] } =>
  instances?.length
    ? {
        instances: instances.map(({ instanceId, serviceId, name, isDuplicate }) => ({
          instanceId,
          serviceId,
          name,
          isDuplicate,
        })),
      }
    : {};

/**
 * The integration name, description and service instances for a saved-object write. Spread into
 * every create and update that carries the service selection, so resume sees what the last deploy
 * used (the name can change between deploys while it still follows the selection).
 */
export const toSOSettings = (
  serviceSettings: SOSettingsSource | null | undefined
): { integrationName?: string; description?: string; instances?: ServiceInstance[] } => {
  const integrationName = serviceSettings?.integrationName?.trim();
  const description = serviceSettings?.description?.trim();
  return {
    ...(integrationName ? { integrationName } : {}),
    ...(description ? { description } : {}),
    ...toSOInstances(serviceSettings?.instances),
  };
};

/**
 * Same fields for an update: a blank description is sent as `null`, because an omitted field keeps
 * the stored value and the user may just have cleared it.
 */
export const toSOSettingsUpdate = (
  serviceSettings: SOSettingsSource | null | undefined
): { integrationName?: string; description: string | null; instances?: ServiceInstance[] } => {
  const { integrationName, description, instances } = toSOSettings(serviceSettings);
  return {
    ...(integrationName ? { integrationName } : {}),
    description: description ?? null,
    ...(instances ? { instances } : {}),
  };
};

/**
 * The update for settings that need no deploy: the name and description. The instances are left
 * out on purpose. The saved object describes what was last deployed, so a duplicate added in Step 2
 * but not deployed yet must not come back on resume; they are saved only with a deploy.
 */
export const toSOMetadataUpdate = (
  serviceSettings: SOSettingsSource | null | undefined
): { integrationName?: string; description: string | null } => {
  const { instances, ...metadata } = toSOSettingsUpdate(serviceSettings);
  return metadata;
};
