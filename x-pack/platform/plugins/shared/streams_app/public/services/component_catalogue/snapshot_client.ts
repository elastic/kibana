/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentCatalogue } from '@kbn/streams-schema';
import type { ComponentCatalogueClient } from './types';

let cachedCatalogue: Promise<ComponentCatalogue> | undefined;

const loadSnapshot = async (): Promise<ComponentCatalogue> => {
  const { default: snapshot } = await import('./catalogue_snapshot/components_v1.json');
  return snapshot as ComponentCatalogue;
};

/**
 * Serves a captured `GET /v1/components` response until the Kibana catalogue
 * routes exist (https://github.com/elastic/ingest-dev/issues/9878).
 */
export const createSnapshotComponentCatalogueClient = (): ComponentCatalogueClient => ({
  getCatalogue: () => {
    cachedCatalogue ??= loadSnapshot();
    return cachedCatalogue;
  },
});
