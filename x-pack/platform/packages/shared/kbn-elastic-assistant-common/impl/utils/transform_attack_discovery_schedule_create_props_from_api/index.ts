/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryScheduleCreateProps } from '../../schemas/attack_discovery/routes/public/schedules/schedules.gen';
import type { AttackDiscoveryApiScheduleCreateProps } from '../../schemas/attack_discovery/routes/public/schedules/schedules_api.gen';
import { transformAttackDiscoveryScheduleActionsPropsFromApi } from '../transform_attack_discovery_schedule_actions_props_from_api';

export const transformAttackDiscoveryScheduleCreatePropsFromApi = (
  apiCreateProps: AttackDiscoveryApiScheduleCreateProps
): AttackDiscoveryScheduleCreateProps => {
  return {
    name: apiCreateProps.name,
    enabled: apiCreateProps.enabled,
    params: {
      alertsIndexPattern: apiCreateProps.params.alerts_index_pattern,
      apiConfig: apiCreateProps.params.api_config,
      end: apiCreateProps.params.end,
      query: apiCreateProps.params.query,
      filters: apiCreateProps.params.filters,
      combinedFilter: apiCreateProps.params.combined_filter,
      size: apiCreateProps.params.size,
      start: apiCreateProps.params.start,
    },
    schedule: apiCreateProps.schedule,
    actions: transformAttackDiscoveryScheduleActionsPropsFromApi(apiCreateProps.actions),
  };
};
