/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryScheduleAction } from '../../schemas/attack_discovery/routes/public/schedules/schedules.gen';
import type {
  AttackDiscoveryApiScheduleAction,
  AttackDiscoveryApiScheduleGeneralAction,
} from '../../schemas/attack_discovery/routes/public/schedules/schedules_api.gen';

const isGeneralAction = (
  action: AttackDiscoveryApiScheduleAction
): action is AttackDiscoveryApiScheduleGeneralAction => {
  return Object.hasOwn(action, 'group');
};

export const transformAttackDiscoveryScheduleActionsPropsFromApi = (
  actions: AttackDiscoveryApiScheduleAction[] | undefined
): AttackDiscoveryScheduleAction[] | undefined => {
  return actions?.map((action) => {
    if (isGeneralAction(action)) {
      return {
        actionTypeId: action.action_type_id,
        group: action.group,
        id: action.id,
        params: action.params,
        uuid: action.uuid,
        alertsFilter: action.alerts_filter,
        frequency: action.frequency
          ? {
              summary: action.frequency.summary,
              notifyWhen: action.frequency.notify_when,
              throttle: action.frequency.throttle,
            }
          : undefined,
      };
    }
    return {
      actionTypeId: action.action_type_id,
      id: action.id,
      params: action.params,
      uuid: action.uuid,
    };
  });
};
