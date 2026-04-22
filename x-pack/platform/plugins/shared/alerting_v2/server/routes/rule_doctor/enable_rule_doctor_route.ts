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
import {
  RuleDoctorSettingsSavedObjectsClientToken,
  RULE_DOCTOR_SETTINGS_SO_ID,
  DEFAULT_RULE_DOCTOR_SETTINGS,
} from '../../lib/rule_doctor_settings';
import type { RuleDoctorSettings } from '../../lib/rule_doctor_settings';
import { RULE_DOCTOR_SETTINGS_SAVED_OBJECT_TYPE } from '../../saved_objects';
import type { AlertingServerStartDependencies } from '../../types';
import { settingsToSchedule } from '../../lib/tasks/rule_doctor/schedule_task';
import {
  RULE_DOCTOR_TASK_TYPE,
  getRuleDoctorTaskId,
} from '../../lib/tasks/rule_doctor/task_definition';

const responseSchema = z.object({
  enabled: z.boolean(),
  spaceId: z.string(),
});

@injectable()
export class EnableRuleDoctorRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = '/internal/alerting/v2/rule_doctor/_enable';
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.write],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Enable Rule Doctor for the current space',
  };
  static validate = {
    request: {},
    response: {
      200: {
        body: () => responseSchema,
        description: 'Rule Doctor enabled for the space.',
      },
    },
  };

  protected readonly routeName = 'enable rule doctor';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request) private readonly request: KibanaRequest,
    @inject(PluginStart<AlertingServerStartDependencies['taskManager']>('taskManager'))
    private readonly taskManager: AlertingServerStartDependencies['taskManager'],
    @inject(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'))
    private readonly spaces: SpacesPluginStart,
    @inject(RuleDoctorSettingsSavedObjectsClientToken)
    private readonly soClient: SavedObjectsClientContract
  ) {
    super(ctx);
  }

  protected async execute() {
    const spaceId = this.spaces.spacesService.getSpaceId(this.request);

    let settings: RuleDoctorSettings;
    try {
      const so = await this.soClient.get<RuleDoctorSettings>(
        RULE_DOCTOR_SETTINGS_SAVED_OBJECT_TYPE,
        RULE_DOCTOR_SETTINGS_SO_ID
      );
      settings = so.attributes;
    } catch {
      settings = DEFAULT_RULE_DOCTOR_SETTINGS;
    }

    const schedule = settingsToSchedule({ ...settings, scheduleEnabled: true });

    await this.taskManager.ensureScheduled(
      {
        id: getRuleDoctorTaskId(spaceId),
        taskType: RULE_DOCTOR_TASK_TYPE,
        schedule,
        state: {},
        params: { spaceId },
        scope: ['alerting'],
        enabled: true,
      },
      { request: this.request }
    );

    const updatedSettings: RuleDoctorSettings = { ...settings, scheduleEnabled: true };
    try {
      await this.soClient.update(
        RULE_DOCTOR_SETTINGS_SAVED_OBJECT_TYPE,
        RULE_DOCTOR_SETTINGS_SO_ID,
        updatedSettings
      );
    } catch (e) {
      if ((e as { output?: { statusCode?: number } }).output?.statusCode === 404) {
        await this.soClient.create(RULE_DOCTOR_SETTINGS_SAVED_OBJECT_TYPE, updatedSettings, {
          id: RULE_DOCTOR_SETTINGS_SO_ID,
        });
      } else {
        throw e;
      }
    }

    return this.ctx.response.ok({
      body: { enabled: true, spaceId },
    });
  }
}
