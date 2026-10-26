/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface SOSettingsSource {
  integrationName?: string;
  description?: string;
  namespace?: string;
}

/**
 * The integration name, description and global namespace for a saved-object write. Spread into
 * every create and update that carries the service selection, so resume sees the settings the last
 * deploy used (the name can change between deploys while it still follows the selection).
 */
export const toSOSettings = (
  serviceSettings: SOSettingsSource | null | undefined
): { integrationName?: string; description?: string; namespace?: string } => {
  const integrationName = serviceSettings?.integrationName?.trim();
  const description = serviceSettings?.description?.trim();
  const namespace = serviceSettings?.namespace?.trim();
  return {
    ...(integrationName ? { integrationName } : {}),
    ...(description ? { description } : {}),
    ...(namespace ? { namespace } : {}),
  };
};

/**
 * Same fields for an update: a blank description or namespace is sent as `null`, because an
 * omitted field keeps the stored value and the user may just have cleared it.
 */
export const toSOSettingsUpdate = (
  serviceSettings: SOSettingsSource | null | undefined
): { integrationName?: string; description: string | null; namespace: string | null } => {
  const { integrationName, description, namespace } = toSOSettings(serviceSettings);
  return {
    ...(integrationName ? { integrationName } : {}),
    description: description ?? null,
    namespace: namespace ?? null,
  };
};
