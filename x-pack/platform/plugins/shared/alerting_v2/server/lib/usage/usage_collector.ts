/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { AlertingServerStartDependencies } from '../../types';
import { TASK_ID } from './task_definition';
import type { LatestTaskStateSchema } from './task_state';

async function getLatestTaskState(taskManager: AlertingServerStartDependencies['taskManager']) {
  try {
    const result = await taskManager.get(TASK_ID);
    return result;
  } catch (err) {
    const errMessage = err && err.message ? err.message : err.toString();
    /*
      The usage service WILL try to fetch from this collector before the task manager has been initialized, because the
      task manager has to wait for all plugins to initialize first. It's fine to ignore it as next time around it will be
      initialized (or it will throw a different type of error)
    */
    if (!errMessage.includes('NotInitialized')) {
      throw err;
    }
  }

  return null;
}

export function registerAlertingV2UsageCollector(
  getTaskManager: () => AlertingServerStartDependencies['taskManager'],
  usageCollection: UsageCollectionSetup
) {
  type AlertingV2Usage = Omit<LatestTaskStateSchema, 'runs'>;

  const collector = usageCollection.makeUsageCollector<AlertingV2Usage>({
    type: 'alerting_v2',
    fetch: async () => {
      try {
        const taskManager = getTaskManager();
        const doc = await getLatestTaskState(taskManager);
        const { runs: _runs, ...state } = get(doc, 'state') as LatestTaskStateSchema;

        return state;
      } catch (err) {
        const errorMessage = err && err.message ? err.message : err.toString();
        return {
          has_errors: true,
          error_messages: [errorMessage],
        };
      }
    },
    isReady: () => true,
    schema: {
      has_errors: { type: 'boolean' },
      error_messages: { type: 'array', items: { type: 'keyword' } },
      count_total: { type: 'long' },
      count_enabled: { type: 'long' },
      count_by_kind: { DYNAMIC_KEY: { type: 'long' } },
      count_by_schedule: { DYNAMIC_KEY: { type: 'long' } },
      count_by_lookback: { DYNAMIC_KEY: { type: 'long' } },
      count_with_query_condition: { type: 'long' },
      count_with_recovery_policy: { type: 'long' },
      count_by_recovery_policy_type: { DYNAMIC_KEY: { type: 'long' } },
      count_with_recovery_query_condition: { type: 'long' },
      count_by_pending_timeframe: { DYNAMIC_KEY: { type: 'long' } },
      count_by_recovering_timeframe: { DYNAMIC_KEY: { type: 'long' } },
      count_with_grouping: { type: 'long' },
      avg_grouping_fields_count: { type: 'float' },
      count_with_no_data: { type: 'long' },
      count_by_no_data_behavior: { DYNAMIC_KEY: { type: 'long' } },
      count_by_no_data_timeframe: { DYNAMIC_KEY: { type: 'long' } },
      count_notification_policies: { type: 'long' },
      min_created_at: { type: 'date' },

      notification_policies_count: { type: 'long' },
      notification_policies_unique_workflow_count: { type: 'long' },
      notification_policies_count_with_matcher: { type: 'long' },
      notification_policies_count_with_group_by: { type: 'long' },
      notification_policies_avg_group_by_fields_count: { type: 'float' },
      notification_policies_count_by_throttle_interval: { DYNAMIC_KEY: { type: 'long' } },

      alerts_count: { type: 'long' },
      alerts_count_by_kind: { DYNAMIC_KEY: { type: 'long' } },
      alerts_count_by_source: { DYNAMIC_KEY: { type: 'long' } },
      alerts_count_by_type: { DYNAMIC_KEY: { type: 'long' } },
      alerts_episode_count: { type: 'long' },
      alerts_min_timestamp: { type: 'date' },
      alerts_index_size_bytes: { type: 'long' },
    },
  });

  usageCollection.registerCollector(collector);
}
