/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, CoreSetup } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';

interface StartDeps {
  inference: InferenceServerStart;
}

export function registerDefaultConnectorRoute(
  router: IRouter,
  getStartServices: CoreSetup<StartDeps>['getStartServices']
) {
  router.get(
    {
      path: '/internal/ai_summary_panel/default_connector',
      security: {
        authz: { enabled: false, reason: 'Delegates auth to the inference plugin' },
      },
      options: { access: 'internal' },
      validate: false,
    },
    async (context, request, response) => {
      const [, { inference }] = await getStartServices();
      const connector = await inference.getDefaultConnector(request);
      if (!connector) {
        return response.notFound({ body: 'No default inference connector configured' });
      }
      return response.ok({ body: { connectorId: connector.connectorId } });
    }
  );
}
