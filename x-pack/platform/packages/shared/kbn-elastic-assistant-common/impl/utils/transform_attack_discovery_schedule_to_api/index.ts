/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoverySchedule } from '../../schemas/attack_discovery/routes/public/schedules/schedules.gen';
import type { AttackDiscoveryApiSchedule } from '../../schemas/attack_discovery/routes/public/schedules/schedules_api.gen';

export const transformAttackDiscoveryScheduleToApi = (
  attackDiscoverySchedule: AttackDiscoverySchedule
): AttackDiscoveryApiSchedule => ({
  id: attackDiscoverySchedule.id,
  name: attackDiscoverySchedule.name,
  created_by: attackDiscoverySchedule.createdBy,
  updated_by: attackDiscoverySchedule.updatedBy,
  created_at: attackDiscoverySchedule.createdAt,
  updated_at: attackDiscoverySchedule.updatedAt,
  enabled: attackDiscoverySchedule.enabled,
  params: {
    alerts_index_pattern: attackDiscoverySchedule.params.alertsIndexPattern,
    api_config: attackDiscoverySchedule.params.apiConfig,
    end: attackDiscoverySchedule.params.end,
    query: attackDiscoverySchedule.params.query,
    filters: attackDiscoverySchedule.params.filters,
    combined_filter: attackDiscoverySchedule.params.combinedFilter,
    size: attackDiscoverySchedule.params.size,
    start: attackDiscoverySchedule.params.start,
  },
  schedule: attackDiscoverySchedule.schedule,
  actions: attackDiscoverySchedule.actions.map((action) => ({
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
  })),
  last_execution: attackDiscoverySchedule.lastExecution,
});
