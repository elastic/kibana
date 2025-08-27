/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IRouter, RequestHandlerContext } from '@kbn/core/server';
import { getConnectorList } from '../util/get_connector_list';
import type { InferenceServerStart, InferenceStartDependencies } from '../types';

export function registerConnectorsRoute({
  coreSetup,
  router,
}: {
  coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>;
  router: IRouter<RequestHandlerContext>;
}) {
  router.get(
    {
      path: '/internal/inference/connectors',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {},
    },
    async (_context, request, response) => {
      const actions = await coreSetup
        .getStartServices()
        .then(([_coreStart, pluginsStart]) => pluginsStart.actions);
      const connectors = await getConnectorList({ actions, request });
      return response.ok({ body: { connectors } });
    }
  );
}
