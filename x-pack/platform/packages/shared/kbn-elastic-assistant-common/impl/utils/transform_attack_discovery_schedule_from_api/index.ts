/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoverySchedule } from '../../schemas/attack_discovery/routes/public/schedules/schedules.gen';
import type { AttackDiscoveryApiSchedule } from '../../schemas/attack_discovery/routes/public/schedules/schedules_api.gen';

export const transformAttackDiscoveryScheduleFromApi = (
  api: AttackDiscoveryApiSchedule
): AttackDiscoverySchedule => {
  return {
    id: api.id,
    name: api.name,
    createdBy: api.created_by,
    updatedBy: api.updated_by,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
    enabled: api.enabled,
    params: {
      alertsIndexPattern: api.params.alerts_index_pattern,
      apiConfig: api.params.api_config,
      end: api.params.end,
      query: api.params.query,
      filters: api.params.filters,
      combinedFilter: api.params.combined_filter,
      size: api.params.size,
      start: api.params.start,
    },
    schedule: api.schedule,
    actions: api.actions.map((action) => ({
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
    lastExecution: api.last_execution,
  };
};
