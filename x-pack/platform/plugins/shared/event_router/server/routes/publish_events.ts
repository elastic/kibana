/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { ApiPrivileges } from '@kbn/core-security-server';
import type { EventRouter } from '../event_router';
import { InvalidEventError } from '../errors';
import type { PublishResult } from '../types';

export const PUBLISH_EVENTS_PATH = '/api/event_router/events';

/**
 * Granted to no role by default, so only a superuser can publish until an
 * operator grants it explicitly.
 */
export const EVENT_ROUTER_FEATURE_ID = 'event_router';

interface RegisterPublishEventsRouteDeps {
  router: IRouter;
  eventRouter: EventRouter;
  maxEventsPerRequest: number;
}

export const registerPublishEventsRoute = ({
  router,
  eventRouter,
  maxEventsPerRequest,
}: RegisterPublishEventsRouteDeps): void => {
  router.versioned
    .post({
      path: PUBLISH_EVENTS_PATH,
      access: 'public',
      summary: 'Publish events to the event router',
      description:
        'Accepts events from an external system and hands each one to every listener whose filter matches. Returns a non-2xx status if any listener did not accept an event, so the producer can retry.',
      security: {
        authz: {
          requiredPrivileges: [ApiPrivileges.manage(EVENT_ROUTER_FEATURE_ID)],
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: schema.object({
              events: schema.arrayOf(
                schema.object({
                  type: schema.string({ minLength: 1 }),
                  attributes: schema.maybe(schema.recordOf(schema.string(), schema.string())),
                  payload: schema.maybe(schema.recordOf(schema.string(), schema.any())),
                }),
                { minSize: 1, maxSize: maxEventsPerRequest }
              ),
            }),
          },
        },
      },
      async (context, request, response) => {
        let results: PublishResult[];

        try {
          results = await eventRouter.publishBatch(request.body.events, request);
        } catch (error) {
          if (error instanceof InvalidEventError) {
            return response.badRequest({ body: { message: error.message } });
          }
          throw error;
        }

        const undelivered = results.filter(({ failures }) => failures.length > 0);

        if (undelivered.length > 0) {
          return response.customError({
            statusCode: 500,
            body: {
              message: `${undelivered.length} of ${results.length} event(s) were not accepted by every listener. Retry the request; listeners that already accepted an event will see it again.`,
              attributes: { results },
            },
          });
        }

        return response.ok({ body: { results } });
      }
    );
};
