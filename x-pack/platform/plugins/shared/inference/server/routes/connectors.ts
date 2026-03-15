/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IRouter, Logger, RequestHandlerContext } from '@kbn/core/server';
import type { GetConnectorsResponseBody } from '../../common/http_apis';
import { getConnectorList } from '../util/get_connector_list';
import type { InferenceServerStart, InferenceStartDependencies } from '../types';

export function registerConnectorsRoute({
  coreSetup,
  router,
  logger,
}: {
  coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>;
  router: IRouter<RequestHandlerContext>;
  logger: Logger;
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
      const [coreStart, pluginsStart] = await coreSetup.getStartServices();
      const actions = pluginsStart.actions;
      const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
      const connectors = await getConnectorList({ actions, request, esClient, logger });

      // `anonymizationEnabled` is informational UI state for Agent Builder access checks.
      // It must not be treated as a security boundary. Deanonymization is enforced
      // server-side by replacements API privileges (`read_anonymization`).
      const body: GetConnectorsResponseBody = {
        connectors,
        anonymizationEnabled: pluginsStart.anonymization?.isEnabled() ?? false,
      };
      return response.ok({ body });
    }
  );
}
