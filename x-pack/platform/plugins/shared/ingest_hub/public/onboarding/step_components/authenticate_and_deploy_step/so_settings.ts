/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The integration name and description for a saved-object write. Spread into every create and
 * update that carries the service selection, so resume sees the name the last deploy used (it can
 * change between deploys while it still follows the selection).
 */
export const toSOSettings = (
  serviceSettings: { integrationName?: string; description?: string } | null | undefined
): { integrationName?: string; description?: string } => {
  const integrationName = serviceSettings?.integrationName?.trim();
  const description = serviceSettings?.description?.trim();
  return {
    ...(integrationName ? { integrationName } : {}),
    ...(description ? { description } : {}),
  };
};

/**
 * Same fields for an update: a blank description is sent as `null`, because an omitted field keeps
 * the stored value and the user may just have cleared it.
 */
export const toSOSettingsUpdate = (
  serviceSettings: { integrationName?: string; description?: string } | null | undefined
): { integrationName?: string; description: string | null } => {
  const { integrationName, description } = toSOSettings(serviceSettings);
  return {
    ...(integrationName ? { integrationName } : {}),
    description: description ?? null,
  };
};
