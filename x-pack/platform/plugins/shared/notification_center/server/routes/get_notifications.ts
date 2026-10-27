/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { Request, Response } from '@kbn/core-di-server';
import type { KibanaRequest, KibanaResponseFactory, RouteSecurity } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { GET_NOTIFICATIONS_PATH } from '../../common/routes';
import { notificationQueryParamsSchema } from '../../common/notification_schema';
import type { NotificationQueryParamsParsed } from '../../common/types';
import { NotificationQueryService } from '../lib/query_notifications';
import { ReadStateService } from '../lib/read_state';
import { NC_AUTHZ_OPT_OUT_REASON } from '../constants';

/**
 * `GET /internal/notification_center/notifications`
 * Items carry the caller's `isRead` state; callers without a user profile (API keys)
 * get the list without it.
 */
@injectable()
export class GetNotificationsRoute {
  static method = 'get' as const;
  static path = GET_NOTIFICATIONS_PATH;
  static options = { access: 'internal' } as const;
  static security: RouteSecurity = {
    authz: { enabled: false, reason: NC_AUTHZ_OPT_OUT_REASON },
  };
  static validate = {
    query: buildRouteValidationWithZod(notificationQueryParamsSchema),
  };

  constructor(
    @inject(NotificationQueryService) private readonly notifications: NotificationQueryService,
    @inject(ReadStateService) private readonly readState: ReadStateService,
    @inject(Request)
    private readonly request: KibanaRequest<never, NotificationQueryParamsParsed, never>,
    @inject(Response) private readonly response: KibanaResponseFactory
  ) {}

  async handle() {
    // read-state fetch runs concurrently with the ES query
    const readState = this.readState.hasUserProfile ? this.readState.get() : undefined;
    const result = await this.notifications.query(this.request.query, readState);
    return this.response.ok({ body: result });
  }
}
