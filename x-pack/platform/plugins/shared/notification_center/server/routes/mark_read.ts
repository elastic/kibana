/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { Request, Response } from '@kbn/core-di-server';
import type { KibanaRequest, KibanaResponseFactory, RouteSecurity } from '@kbn/core/server';
import { notificationIdSchema } from '../../common/notification_schema';
import { MARK_READ_PATH } from '../../common/routes';
import { ReadStateService } from '../lib/read_state';
import { NC_AUTHZ_OPT_OUT_REASON } from '../constants';

const markReadBodySchema = z.object({ notification_id: notificationIdSchema }).strict();

type MarkReadBody = z.infer<typeof markReadBodySchema>;

/**
 * `POST /internal/notification_center/notifications/_mark_read`
 * Mark an individual notification as read by adding it to the user's overrides object.
 * Anonymous users (no `profile_uid`) have no read-state to write, so the call is forbidden.
 */
@injectable()
export class MarkReadRoute {
  static method = 'post' as const;
  static path = MARK_READ_PATH;
  static options = { access: 'internal' } as const;
  static security: RouteSecurity = {
    authz: { enabled: false, reason: NC_AUTHZ_OPT_OUT_REASON },
  };
  static validate = {
    body: buildRouteValidationWithZod(markReadBodySchema),
  };

  constructor(
    @inject(ReadStateService) private readonly readState: ReadStateService,
    @inject(Request) private readonly request: KibanaRequest<never, never, MarkReadBody>,
    @inject(Response) private readonly response: KibanaResponseFactory
  ) {}

  async handle() {
    if (!this.readState.hasUserProfile) {
      return this.response.forbidden({
        body: { message: 'A user profile is required to modify read state.' },
      });
    }

    const { notification_id: notificationId } = this.request.body;
    await this.readState.markRead(notificationId);
    return this.response.ok({ body: { success: true } });
  }
}
