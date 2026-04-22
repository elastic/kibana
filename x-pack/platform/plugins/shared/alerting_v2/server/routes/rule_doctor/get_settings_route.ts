/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { z } from '@kbn/zod/v4';
import type { RouteSecurity } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import {
  RuleDoctorSettingsSavedObjectsClientToken,
  RULE_DOCTOR_SETTINGS_SO_ID,
  DEFAULT_RULE_DOCTOR_SETTINGS,
} from '../../lib/rule_doctor_settings';
import type { RuleDoctorSettings } from '../../lib/rule_doctor_settings';
import { RULE_DOCTOR_SETTINGS_SAVED_OBJECT_TYPE } from '../../saved_objects';

const rruleSchema = z.object({
  freq: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  interval: z.number(),
  tzid: z.string(),
  dtstart: z.string().optional(),
  byhour: z.array(z.number()).optional(),
  byminute: z.array(z.number()).optional(),
  byweekday: z.array(z.string()).optional(),
  bymonthday: z.array(z.number()).optional(),
});

const responseSchema = z.object({
  scheduleEnabled: z.boolean(),
  scheduleType: z.enum(['interval', 'rrule']),
  interval: z.string().optional(),
  rrule: rruleSchema.optional(),
});

@injectable()
export class GetRuleDoctorSettingsRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = '/internal/alerting/v2/rule_doctor/settings';
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Get Rule Doctor settings',
  };
  static validate = {
    request: {},
    response: {
      200: {
        body: () => responseSchema,
        description: 'Rule Doctor settings.',
      },
    },
  };

  protected readonly routeName = 'get rule doctor settings';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(RuleDoctorSettingsSavedObjectsClientToken)
    private readonly soClient: SavedObjectsClientContract
  ) {
    super(ctx);
  }

  protected async execute() {
    let settings: RuleDoctorSettings;

    try {
      const so = await this.soClient.get<RuleDoctorSettings>(
        RULE_DOCTOR_SETTINGS_SAVED_OBJECT_TYPE,
        RULE_DOCTOR_SETTINGS_SO_ID
      );
      settings = so.attributes;
    } catch (e) {
      if ((e as { output?: { statusCode?: number } }).output?.statusCode === 404) {
        settings = DEFAULT_RULE_DOCTOR_SETTINGS;
      } else {
        throw e;
      }
    }

    return this.ctx.response.ok({ body: settings });
  }
}
