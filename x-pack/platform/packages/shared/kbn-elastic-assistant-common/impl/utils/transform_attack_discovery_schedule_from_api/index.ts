/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoverySchedule } from '../../schemas/attack_discovery/routes/public/schedules/schedules.gen';
import type { AttackDiscoveryApiSchedule } from '../../schemas/attack_discovery/routes/public/schedules/schedules_api.gen';
import { transformAttackDiscoveryScheduleActionsPropsFromApi } from '../transform_attack_discovery_schedule_actions_props_from_api';

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
    actions: transformAttackDiscoveryScheduleActionsPropsFromApi(api.actions) ?? [],
    lastExecution: api.last_execution,
  };
};
