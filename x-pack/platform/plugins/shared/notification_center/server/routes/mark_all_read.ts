/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { Response } from '@kbn/core-di-server';
import type { KibanaResponseFactory, RouteSecurity } from '@kbn/core/server';
import { MARK_ALL_READ_PATH } from '../../common/routes';
import { ReadStateService } from '../lib/read_state';
import { NC_AUTHZ_OPT_OUT_REASON } from '../constants';

/**
 * `POST /internal/notification_center/notifications/_mark_all_read`
 * Advances the user's `readAllBefore` marker to now and clears their per-id read overrides.
 * Anonymous users (no `profile_uid`) have no read-state, so the call is forbidden.
 */
@injectable()
export class MarkAllReadRoute {
  static method = 'post' as const;
  static path = MARK_ALL_READ_PATH;
  static options = { access: 'internal' } as const;
  static security: RouteSecurity = {
    authz: { enabled: false, reason: NC_AUTHZ_OPT_OUT_REASON },
  };
  static validate = false as const;

  constructor(
    @inject(ReadStateService) private readonly readState: ReadStateService,
    @inject(Response) private readonly response: KibanaResponseFactory
  ) {}

  async handle() {
    if (!this.readState.hasUserProfile) {
      return this.response.forbidden({
        body: { message: 'A user profile is required to modify read state.' },
      });
    }

    const readAllBefore = await this.readState.markAllRead();
    return this.response.ok({ body: { success: true, read_all_before: readAllBefore } });
  }
}
