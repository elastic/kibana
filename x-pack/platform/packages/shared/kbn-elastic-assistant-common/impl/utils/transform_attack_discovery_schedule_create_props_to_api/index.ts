/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryScheduleCreateProps } from '../../schemas/attack_discovery/routes/public/schedules/schedules.gen';
import type { AttackDiscoveryApiScheduleCreateProps } from '../../schemas/attack_discovery/routes/public/schedules/schedules_api.gen';

export const transformAttackDiscoveryScheduleCreatePropsToApi = (
  createProps: AttackDiscoveryScheduleCreateProps
): AttackDiscoveryApiScheduleCreateProps => ({
  name: createProps.name,
  enabled: createProps.enabled,
  params: {
    alerts_index_pattern: createProps.params.alertsIndexPattern,
    api_config: createProps.params.apiConfig,
    end: createProps.params.end,
    query: createProps.params.query,
    filters: createProps.params.filters,
    combined_filter: createProps.params.combinedFilter,
    size: createProps.params.size,
    start: createProps.params.start,
  },
  schedule: createProps.schedule,
  actions: createProps.actions?.map((action) => ({
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
});
