/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { Response } from '@kbn/core-di-server';
import type { KibanaResponseFactory, RouteSecurity } from '@kbn/core/server';
import { GET_UNREAD_STATUS_PATH } from '../../common/routes';
import { UnreadStatusService } from '../lib/query_unread_status';
import { ReadStateService } from '../lib/read_state';
import { NC_AUTHZ_OPT_OUT_REASON } from '../constants';

/**
 * `GET /internal/notification_center/notifications/_unread_status`
 * Answers the bell badge for callers with profile-scoped read state.
 */
@injectable()
export class GetUnreadStatusRoute {
  static method = 'get' as const;
  static path = GET_UNREAD_STATUS_PATH;
  static options = { access: 'internal' } as const;
  static security: RouteSecurity = {
    authz: { enabled: false, reason: NC_AUTHZ_OPT_OUT_REASON },
  };
  static validate = false as const;

  constructor(
    @inject(UnreadStatusService) private readonly unreadStatus: UnreadStatusService,
    @inject(ReadStateService) private readonly readState: ReadStateService,
    @inject(Response) private readonly response: KibanaResponseFactory
  ) {}

  async handle() {
    if (!this.readState.hasUserProfile) {
      return this.response.forbidden({
        body: { message: 'A user profile is required to check unread status.' },
      });
    }

    const readState = await this.readState.get();
    if (!readState) {
      return this.response.customError({
        statusCode: 500,
        body: { message: 'Failed to load unread status.' },
      });
    }

    const result = await this.unreadStatus.query(readState);
    return this.response.ok({ body: result });
  }
}
