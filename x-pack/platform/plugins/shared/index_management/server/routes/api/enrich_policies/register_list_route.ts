/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { RouteDependencies } from '../../../types';
import { addInternalBasePath } from '..';
import { enrichPoliciesActions } from '../../../lib/enrich_policies';

export function registerListRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.get(
    { path: addInternalBasePath('/enrich_policies'), validate: false },
    async (context, request, response) => {
      const client = (await context.core).elasticsearch.client as IScopedClusterClient;
      try {
        const policies = await enrichPoliciesActions.fetchAll(client);
        return response.ok({ body: policies });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
