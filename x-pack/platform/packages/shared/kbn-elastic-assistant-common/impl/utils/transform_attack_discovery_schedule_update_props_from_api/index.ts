/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryScheduleUpdateProps } from '../../schemas/attack_discovery/routes/public/schedules/schedules.gen';
import type { AttackDiscoveryApiScheduleUpdateProps } from '../../schemas/attack_discovery/routes/public/schedules/schedules_api.gen';

export const transformAttackDiscoveryScheduleUpdatePropsFromApi = (
  apiUpdateProps: AttackDiscoveryApiScheduleUpdateProps
): AttackDiscoveryScheduleUpdateProps => ({
  name: apiUpdateProps.name,
  params: {
    alertsIndexPattern: apiUpdateProps.params.alerts_index_pattern,
    apiConfig: apiUpdateProps.params.api_config,
    end: apiUpdateProps.params.end,
    query: apiUpdateProps.params.query,
    filters: apiUpdateProps.params.filters,
    combinedFilter: apiUpdateProps.params.combined_filter,
    size: apiUpdateProps.params.size,
    start: apiUpdateProps.params.start,
  },
  schedule: apiUpdateProps.schedule,
  actions: apiUpdateProps.actions.map((action) => ({
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
  })),
});
