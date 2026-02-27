/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryScheduleUpdateProps } from '../../schemas/attack_discovery/routes/public/schedules/schedules.gen';
import type { AttackDiscoveryApiScheduleUpdateProps } from '../../schemas/attack_discovery/routes/public/schedules/schedules_api.gen';
import { transformAttackDiscoveryScheduleActionsPropsToApi } from '../transform_attack_discovery_schedule_actions_props_to_api';

export const transformAttackDiscoveryScheduleUpdatePropsToApi = (
  updateProps: AttackDiscoveryScheduleUpdateProps
): AttackDiscoveryApiScheduleUpdateProps => ({
  name: updateProps.name,
  params: {
    alerts_index_pattern: updateProps.params.alertsIndexPattern,
    api_config: updateProps.params.apiConfig,
    end: updateProps.params.end,
    query: updateProps.params.query,
    filters: updateProps.params.filters,
    combined_filter: updateProps.params.combinedFilter,
    size: updateProps.params.size,
    start: updateProps.params.start,
  },
  schedule: updateProps.schedule,
  actions: transformAttackDiscoveryScheduleActionsPropsToApi(updateProps.actions) ?? [],
});
