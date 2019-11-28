/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { canStartTrial, startTrial } from '../../../lib/start_trial';
import { Server } from '../../../types';

export function registerStartTrialRoutes(server: Server, xpackInfo: any) {
  server.router.get(
    { path: '/api/license/start_trial', validate: false },
    async (ctx, request, response) => {
      try {
        return response.ok({ body: await canStartTrial(request, server.plugins.elasticsearch) });
      } catch (e) {
        return response.internalError({ body: e });
      }
    }
  );

  server.router.post(
    { path: '/api/license/start_trial', validate: false },
    async (ctx, request, response) => {
      try {
        return response.ok({
          body: await startTrial(request, server.plugins.elasticsearch, xpackInfo),
        });
      } catch (e) {
        return response.internalError({ body: e });
      }
    }
  );
}
