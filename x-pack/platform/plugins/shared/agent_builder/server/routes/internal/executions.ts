/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { Observable } from 'rxjs';
import type { ServerSentEvent } from '@kbn/sse-utils';
import { observableIntoEventSourceStream } from '@kbn/sse-utils-server';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import { internalApiPath } from '../../../common/constants';
import { apiPrivileges } from '../../../common/features';
import { getSSEResponseHeaders } from '../utils';

export function registerInternalExecutionRoutes({
  router,
  getInternalServices,
  coreSetup,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.get(
    {
      path: `${internalApiPath}/executions/{executionId}/follow`,
      security: {
        authz: {
          requiredPrivileges: [apiPrivileges.readAgentBuilder],
        },
      },
      options: { access: 'internal' },
      validate: {
        params: schema.object({
          executionId: schema.string(),
        }),
        query: schema.object({
          since: schema.maybe(schema.number({ min: 0 })),
        }),
      },
    },
    wrapHandler(async (context, request, response) => {
      const [, { cloud }] = await coreSetup.getStartServices();
      const isCloud = cloud?.isCloudEnabled ?? false;
      const { execution: executionService } = getInternalServices();
      const { executionId } = request.params;
      const { since } = request.query;

      const abortController = new AbortController();
      request.events.aborted$.subscribe(() => {
        abortController.abort();
      });

      const events$ = executionService.followExecution(executionId, { since });
      return response.ok({
        headers: getSSEResponseHeaders(isCloud),
        body: observableIntoEventSourceStream(events$ as unknown as Observable<ServerSentEvent>, {
          signal: abortController.signal,
          logger,
        }),
      });
    })
  );
}
