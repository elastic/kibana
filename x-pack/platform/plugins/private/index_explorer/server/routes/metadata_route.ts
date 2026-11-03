/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_BASE_PATH } from '../../common/constants';
import type { MetadataResponse } from '../../common/types';
import { toMetadataResponse } from '../lib/metadata';
import type { RouteDependencies } from './types';

/** Registers the route serving configured canned queries and index metadata. */
export function registerMetadataRoute({ router, config }: RouteDependencies): void {
  const metadata: MetadataResponse = toMetadataResponse(config);

  router.get(
    {
      path: `${API_BASE_PATH}/metadata`,
      security: {
        authz: {
          enabled: false,
          reason:
            'Returns static, administrator-defined kibana.yml settings; the queries it lists run with the caller Elasticsearch privileges',
        },
      },
      validate: false,
    },
    async (_context, _request, response) => response.ok({ body: metadata })
  );
}
