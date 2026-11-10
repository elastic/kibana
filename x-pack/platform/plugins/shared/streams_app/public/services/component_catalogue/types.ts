/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentCatalogue } from '@kbn/streams-schema';

export interface FetchedComponentCatalogue {
  catalogue: ComponentCatalogue;
  /** Kibana served its cached copy because the distributor could not be reached. */
  stale: boolean;
}

export interface ComponentCatalogueClient {
  /**
   * Fetches the current catalogue; concurrent callers share one request. The browser reuses a
   * recent response on its own, so `forceRefresh` makes it ask Kibana again.
   */
  getCatalogue: (options?: { forceRefresh?: boolean }) => Promise<FetchedComponentCatalogue>;
  /** What the last successful fetch returned in this app session, if any. */
  getLastCatalogue: () => FetchedComponentCatalogue | undefined;
}
