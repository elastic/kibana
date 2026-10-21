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
