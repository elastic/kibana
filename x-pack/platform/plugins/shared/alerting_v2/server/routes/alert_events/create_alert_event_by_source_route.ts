/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { Request } from '@kbn/core-di-server';
import type { z } from '@kbn/zod/v4';
import {
  createAlertEventPathBodySchema,
  createAlertEventSourceParamsSchema,
  type CreateAlertEventData,
} from '@kbn/alerting-v2-schemas';
import { AlertEventsClient } from '../../lib/alert_events_client';
import { ALERTING_V2_ALERT_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import {
  createAlertEventRouteOptions,
  createAlertEventRouteSchemas,
  createAlertEventRouteSecurity,
} from './create_alert_event_route_shared';
import { createAlertEventBySourceOasExamples } from './create_alert_event_oas_example';

/** POST /api/alerting/v2/alerts/:source — source in URL path */
@injectable()
export class CreateAlertEventBySourceRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_ALERT_API_PATH}/{source}`;
  static security = createAlertEventRouteSecurity;
  static routeOptions = {
    ...createAlertEventRouteOptions,
    oasOperationObject: createAlertEventBySourceOasExamples,
  } as const;
  static schemas = {
    request: {
      params: createAlertEventSourceParamsSchema,
      body: createAlertEventPathBodySchema,
    },
    response: createAlertEventRouteSchemas.response,
  };

  protected readonly routeName = 'create alert event by source';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof createAlertEventSourceParamsSchema>,
      unknown,
      z.infer<typeof createAlertEventPathBodySchema>
    >,
    @inject(AlertEventsClient) private readonly alertEventsClient: AlertEventsClient
  ) {
    super(ctx);
  }

  protected async execute() {
    // Normalize at the edge: path source becomes part of the canonical payload.
    const event: CreateAlertEventData = {
      ...this.request.body,
      source: this.request.params.source,
    };
    const result = await this.alertEventsClient.ingestAlertEvent(event);
    return this.ctx.response.created({ body: result });
  }
}
