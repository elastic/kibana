/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttackDiscoveryScheduleAction,
  AttackDiscoveryScheduleGeneralAction,
} from '../../schemas/attack_discovery/routes/public/schedules/schedules.gen';
import type { AttackDiscoveryApiScheduleAction } from '../../schemas/attack_discovery/routes/public/schedules/schedules_api.gen';

const isGeneralAction = (
  action: AttackDiscoveryScheduleAction
): action is AttackDiscoveryScheduleGeneralAction => {
  return Object.hasOwn(action, 'group');
};

export const transformAttackDiscoveryScheduleActionsPropsToApi = (
  actions: AttackDiscoveryScheduleAction[] | undefined
): AttackDiscoveryApiScheduleAction[] | undefined => {
  return actions?.map((action) => {
    if (isGeneralAction(action)) {
      return {
        action_type_id: action.actionTypeId,
        group: action.group,
        id: action.id,
        params: action.params,
        uuid: action.uuid,
        alerts_filter: action.alertsFilter,
        frequency: action.frequency
          ? {
              summary: action.frequency.summary,
              notify_when: action.frequency.notifyWhen,
              throttle: action.frequency.throttle,
            }
          : undefined,
      };
    }
    return {
      action_type_id: action.actionTypeId,
      id: action.id,
      params: action.params,
      uuid: action.uuid,
    };
  });
};
