/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { Request } from '@kbn/core-di-server';
import type { CreateAlertEventData } from '@kbn/alerting-v2-schemas';
import { AlertEventsClient } from '../../lib/alert_events_client';
import { ALERTING_V2_ALERT_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import {
  createAlertEventRouteOptions,
  createAlertEventRouteSchemas,
  createAlertEventRouteSecurity,
} from './create_alert_event_route_shared';
import { createAlertEventOasExamples } from './create_alert_event_oas_example';

/** POST /api/alerting/v2/alerts — source in body */
@injectable()
export class CreateAlertEventRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_ALERT_API_PATH}`;
  static security = createAlertEventRouteSecurity;
  static routeOptions = {
    ...createAlertEventRouteOptions,
    oasOperationObject: createAlertEventOasExamples,
  } as const;
  static schemas = createAlertEventRouteSchemas;

  protected readonly routeName = 'create alert event';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, CreateAlertEventData>,
    @inject(AlertEventsClient) private readonly alertEventsClient: AlertEventsClient
  ) {
    super(ctx);
  }

  protected async execute() {
    // Body schema already requires source — pass through as the canonical payload.
    const result = await this.alertEventsClient.ingestAlertEvent(this.request.body);
    return this.ctx.response.created({ body: result });
  }
}
