/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { inject, injectable } from 'inversify';
import { PluginStart } from '@kbn/core-di';
import { Request } from '@kbn/core-di-server';
import { z } from '@kbn/zod/v4';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { buildRouteValidationWithZod } from '../route_validation';
import {
  RuleDoctorSettingsSavedObjectsClientToken,
  RULE_DOCTOR_SETTINGS_SO_ID,
  validateMinimumInterval,
} from '../../lib/rule_doctor_settings';
import type { RuleDoctorSettings } from '../../lib/rule_doctor_settings';
import { RULE_DOCTOR_SETTINGS_SAVED_OBJECT_TYPE } from '../../saved_objects';
import type { AlertingServerStartDependencies } from '../../types';
import { settingsToSchedule } from '../../lib/tasks/rule_doctor/schedule_task';
import { getRuleDoctorTaskId } from '../../lib/tasks/rule_doctor/task_definition';

const rruleSchema = z.object({
  freq: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  interval: z.number().int().positive(),
  tzid: z.string(),
  dtstart: z.string().optional(),
  byhour: z.array(z.number().int().min(0).max(23)).optional(),
  byminute: z.array(z.number().int().min(0).max(59)).optional(),
  byweekday: z.array(z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])).optional(),
  bymonthday: z.array(z.number().int().min(1).max(31)).optional(),
  bymonth: z.array(z.number().int().min(1).max(12)).optional(),
});

const bodySchema = z.object({
  scheduleEnabled: z.boolean(),
  scheduleType: z.enum(['interval', 'rrule']),
  interval: z.string().optional(),
  rrule: rruleSchema.optional(),
});

const responseSchema = z.object({
  scheduleEnabled: z.boolean(),
  scheduleType: z.enum(['interval', 'rrule']),
  interval: z.string().optional(),
  rrule: rruleSchema.optional(),
});

@injectable()
export class UpdateRuleDoctorSettingsRoute extends BaseAlertingRoute {
  static method = 'put' as const;
  static path = '/internal/alerting/v2/rule_doctor/settings';
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.write],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Update Rule Doctor settings',
  };
  static validate = {
    request: {
      body: buildRouteValidationWithZod(bodySchema),
    },
    response: {
      200: {
        body: () => responseSchema,
        description: 'Rule Doctor settings updated.',
      },
    },
  };

  protected readonly routeName = 'update rule doctor settings';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request) private readonly request: KibanaRequest<unknown, unknown, RuleDoctorSettings>,
    @inject(RuleDoctorSettingsSavedObjectsClientToken)
    private readonly soClient: SavedObjectsClientContract,
    @inject(PluginStart<AlertingServerStartDependencies['taskManager']>('taskManager'))
    private readonly taskManager: AlertingServerStartDependencies['taskManager'],
    @inject(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'))
    private readonly spaces: SpacesPluginStart
  ) {
    super(ctx);
  }

  protected async execute() {
    const settings = this.request.body;

    if (settings.scheduleEnabled && settings.scheduleType === 'interval') {
      if (!settings.interval) {
        throw new Error('interval is required when scheduleType is "interval"');
      }
      validateMinimumInterval(settings.interval);
    }

    if (settings.scheduleEnabled && settings.scheduleType === 'rrule') {
      if (!settings.rrule) {
        throw new Error('rrule is required when scheduleType is "rrule"');
      }
    }

    const attributes: RuleDoctorSettings = {
      scheduleEnabled: settings.scheduleEnabled,
      scheduleType: settings.scheduleType,
      interval: settings.interval,
      rrule: settings.rrule,
    };

    try {
      await this.soClient.update(
        RULE_DOCTOR_SETTINGS_SAVED_OBJECT_TYPE,
        RULE_DOCTOR_SETTINGS_SO_ID,
        attributes
      );
    } catch (e) {
      if ((e as { output?: { statusCode?: number } }).output?.statusCode === 404) {
        await this.soClient.create(RULE_DOCTOR_SETTINGS_SAVED_OBJECT_TYPE, attributes, {
          id: RULE_DOCTOR_SETTINGS_SO_ID,
        });
      } else {
        throw e;
      }
    }

    const spaceId = this.spaces.spacesService.getSpaceId(this.request);
    const schedule = settingsToSchedule(attributes);
    await this.taskManager.bulkUpdateSchedules([getRuleDoctorTaskId(spaceId)], schedule);

    return this.ctx.response.ok({ body: attributes });
  }
}
