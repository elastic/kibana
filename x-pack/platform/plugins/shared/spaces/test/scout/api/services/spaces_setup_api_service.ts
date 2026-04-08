/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger } from '@kbn/scout';

export interface SpacesSetupApiService {
  /**
   * Creates a Kibana space. Intended for test setup only (uses elevated kbnClient privileges).
   */
  create: (id: string, opts?: { disabledFeatures?: string[] }) => Promise<void>;
  /**
   * Deletes a Kibana space. Intended for test teardown only (uses elevated kbnClient privileges).
   * Silently ignores 404 (space already deleted).
   */
  delete: (id: string) => Promise<void>;
}

export const getSpacesSetupApiService = (
  log: ScoutLogger,
  kbnClient: KbnClient
): SpacesSetupApiService => ({
  create: async (id: string, { disabledFeatures = [] }: { disabledFeatures?: string[] } = {}) => {
    log.debug(`spacesSetup.create: creating space [${id}]`);
    await kbnClient.request({
      method: 'POST',
      path: '/api/spaces/space',
      body: { id, name: id, disabledFeatures },
    });
  },

  delete: async (id: string) => {
    log.debug(`spacesSetup.delete: deleting space [${id}]`);
    await kbnClient.request({
      method: 'DELETE',
      path: `/api/spaces/space/${encodeURIComponent(id)}`,
      ignoreErrors: [404],
    });
  },
});
