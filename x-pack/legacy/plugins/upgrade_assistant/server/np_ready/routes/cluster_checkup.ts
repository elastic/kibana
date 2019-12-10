/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { ServerShimWithRouter } from '../types';
import { getUpgradeAssistantStatus } from '../lib/es_migration_apis';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { CloudSetup } from '../../../../../../plugins/cloud/server';
import { createRequestShim } from './create_request_shim';

interface PluginsSetup {
  cloud?: CloudSetup;
}

export function registerClusterCheckupRoutes(
  server: ServerShimWithRouter,
  pluginsSetup: PluginsSetup
) {
  const { cloud } = pluginsSetup;
  const isCloudEnabled = !!(cloud && cloud.isCloudEnabled);
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
  const apmIndexPatterns = _.get(server, 'plugins.apm_oss.indexPatterns', []);

  server.router.get(
    {
      path: '/api/upgrade_assistant/status',
      validate: false,
    },
    versionCheckHandlerWrapper(async (ctx, request, response) => {
      const reqShim = createRequestShim(request);
      try {
        return response.ok({
          body: await getUpgradeAssistantStatus(
            callWithRequest,
            reqShim,
            isCloudEnabled,
            apmIndexPatterns
          ),
        });
      } catch (e) {
        if (e.status === 403) {
          return response.forbidden(e.message);
        }

        return response.internalError({ body: e });
      }
    })
  );
}
