/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { Request } from '@kbn/core-di-server';
import { z } from '@kbn/zod/v4';
import {
  createAlertEventDataSchema,
  createAlertEventResponseSchema,
  createAlertEventSourceParamsSchema,
  errorResponseSchema,
  type CreateAlertEventData,
} from '@kbn/alerting-v2-schemas';
import { AlertEventsClient } from '../../lib/alert_events_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_ALERT_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';

// ── Shared route config ───────────────────────────────────────────────────────

const sharedSecurity: RouteSecurity = {
  authz: {
    requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.alerts.write],
  },
};

const sharedRouteOptions = {
  summary: 'Create an alert event',
  description:
    'Creates an alert event directly without a backing rule. ' +
    'Intended for external monitoring systems pushing pre-normalized alerts.',
} as const;

const sharedSchemas = {
  request: {
    body: createAlertEventDataSchema,
  },
  response: {
    201: {
      body: () => createAlertEventResponseSchema,
      description: 'Indicates a successful call.',
    },
    400: {
      body: () => errorResponseSchema,
      description: 'Indicates an invalid schema or parameters.',
    },
  },
};

// ── Route: POST /api/alerting/v2/alerts  (source in body) ────────────────────

@injectable()
export class CreateAlertEventRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_ALERT_API_PATH}`;
  static security = sharedSecurity;
  static routeOptions = sharedRouteOptions;
  static schemas = sharedSchemas;

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
    const body = this.request.body;
    const source = body.source;

    if (!source) {
      return this.ctx.response.badRequest({
        body: { message: 'source is required (body field or /:source URL path)' },
      });
    }

    const result = await this.alertEventsClient.ingestAlertEvent({ source, body });
    return this.ctx.response.created({ body: result });
  }
}

// ── Route: POST /api/alerting/v2/alerts/:source  (source in URL path) ────────

@injectable()
export class CreateAlertEventBySourceRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_ALERT_API_PATH}/{source}`;
  static security = sharedSecurity;
  static routeOptions = sharedRouteOptions;
  static schemas = {
    request: {
      params: createAlertEventSourceParamsSchema,
      body: createAlertEventDataSchema,
    },
    response: sharedSchemas.response,
  };

  protected readonly routeName = 'create alert event by source';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof createAlertEventSourceParamsSchema>,
      unknown,
      CreateAlertEventData
    >,
    @inject(AlertEventsClient) private readonly alertEventsClient: AlertEventsClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.alertEventsClient.ingestAlertEvent({
      source: this.request.params.source,
      body: this.request.body,
    });
    return this.ctx.response.created({ body: result });
  }
}
