/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import { PluginStart } from '@kbn/core-di';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import type { AlertingServerStartDependencies } from '../../types';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_INTERNAL_SUGGEST_USER_PROFILES_API_PATH } from '../constants';

const ROUTE_AUTH_PRIVILEGES = [ALERTING_V2_API_PRIVILEGES.alerts.read] as const;

const suggestUserProfilesBodySchema = schema.object({
  name: schema.string(),
  size: schema.maybe(schema.number({ min: 0, max: 100 })),
});

type SuggestUserProfilesBody = TypeOf<typeof suggestUserProfilesBodySchema>;

/**
 *
 * There is no generic platform/browser endpoint for “suggest user profiles” that we can safely call directly.
 *
 * Why:
 *
 * bulkGet is built-in (/internal/security/user_profile/_bulk_get), but suggest is intentionally app-defined.
 *
 * In browser APIs, userProfile.suggest requires a path argument (your app’s route), not just params.
 *
 * Optional post-filtering via `requiredPrivileges` on `userProfiles.suggest` is server-only; this route relies on HTTP authz instead so ES matches are not dropped by a second privileges pass.
 *
 * So we need an app route that:
 * - accepts only safe inputs (name, size, dataPath — same shape as browser suggest params)
 * - calls security.userProfiles.suggest(...)
 * - enforces authz (read alert episodes) and internal access
 *
 * So the new route is basically the secure “adapter” between UI search and the security suggest service.
 **/
@injectable()
export class SuggestUserProfilesRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = ALERTING_V2_INTERNAL_SUGGEST_USER_PROFILES_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [...ROUTE_AUTH_PRIVILEGES],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Suggest user profiles',
    description: 'Suggest user profiles for assignee search in alert episodes.',
  } as const;
  static validate = {
    request: {
      body: suggestUserProfilesBodySchema,
    },
  } as const;

  protected readonly routeName = 'suggest user profiles';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, SuggestUserProfilesBody>,
    @inject(PluginStart<AlertingServerStartDependencies['security']>('security'))
    private readonly securityStart: AlertingServerStartDependencies['security']
  ) {
    super(ctx);
  }

  protected async execute() {
    const { name, size } = this.request.body;
    const profiles = await this.securityStart.userProfiles.suggest({
      name,
      size,
      dataPath: 'avatar',
    });

    return this.ctx.response.ok({ body: profiles });
  }
}
