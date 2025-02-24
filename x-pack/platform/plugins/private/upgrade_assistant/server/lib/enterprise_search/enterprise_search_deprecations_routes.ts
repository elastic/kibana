/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setPreEightEnterpriseSearchIndicesReadOnly } from './pre_eight_index_deprecator';
import { versionCheckHandlerWrapper } from '../es_version_precheck';
import { RouteDependencies } from '../../types';

export function registerEnterpriseSearchDeprecationRoutes({
  config: { featureSet },
  router,
  lib: { handleEsError },
  licensing,
  log,
}: RouteDependencies) {
  router.post(
    {
      path: '/internal/enterprise_search/deprecations/set_enterprise_search_indices_read_only',
      validate: {},
    },
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      const { client } = (await core).elasticsearch;
      const setResponse = await setPreEightEnterpriseSearchIndicesReadOnly(client.asCurrentUser);
      if (setResponse.length > 0) {
        return response.badRequest({
          body: { message: setResponse },
          headers: { 'content-type': 'application/json' },
        });
      }
      return response.ok({
        body: { acknowedged: true },
        headers: { 'content-type': 'application/json' },
      });
    })
  );
}
