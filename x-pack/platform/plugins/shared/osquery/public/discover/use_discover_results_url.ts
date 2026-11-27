/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { FilterStateStore } from '@kbn/es-query';
import { useKibana } from '../common/lib/kibana';
import { useLogsDataView } from '../common/hooks/use_logs_data_view';
import type { DateWindowResult } from '../common/pack_view_date_window';
import { isScheduledExecution } from '../common/is_scheduled_execution';

export interface UseDiscoverResultsUrlArgs {
  actionId?: string;
  endDate?: string;
  startDate?: string;
  mode?: DateWindowResult['mode'];
  scheduleId?: string;
  executionCount?: number;
}

export interface UseDiscoverResultsUrlResult {
  /** Whether the current user has access to Discover at all. */
  canDiscover: boolean;
  /** Resolved Discover URL, or an empty string while it is still being computed. */
  discoverUrl: string;
}

/**
 * Builds a Discover URL scoped to a single live-query action or a single scheduled execution
 * (`match_phrase` filters on `action_id`, or on `schedule_id` + the execution count), reused by
 * both `ViewResultsInDiscoverAction` (button/icon rendering) and the results page's "View in"
 * menu item.
 */
export const useDiscoverResultsUrl = ({
  actionId,
  endDate,
  startDate,
  mode,
  scheduleId,
  executionCount,
}: UseDiscoverResultsUrlArgs): UseDiscoverResultsUrlResult => {
  const { discover, application } = useKibana().services;
  const locator = discover?.locator;
  const discoverPermissions = application.capabilities.discover_v2;
  const { data: logsDataView } = useLogsDataView({ skip: !actionId, checkOnly: true });

  const [discoverUrl, setDiscoverUrl] = useState<string>('');

  useEffect(() => {
    const getDiscoverUrl = async () => {
      if (!locator || !logsDataView) return;

      const isScheduled = isScheduledExecution(scheduleId, executionCount);

      const filters = isScheduled
        ? [
            {
              meta: {
                index: logsDataView.id,
                alias: null,
                negate: false,
                disabled: false,
                type: 'phrase',
                key: 'schedule_id',
                params: { query: scheduleId },
              },
              query: { match_phrase: { schedule_id: scheduleId } },
              $state: { store: FilterStateStore.APP_STATE },
            },
            {
              meta: {
                index: logsDataView.id,
                alias: null,
                negate: false,
                disabled: false,
                type: 'phrase',
                key: 'osquery_meta.schedule_execution_count',
                params: { query: executionCount },
              },
              query: {
                match_phrase: {
                  'osquery_meta.schedule_execution_count': executionCount,
                },
              },
              $state: { store: FilterStateStore.APP_STATE },
            },
          ]
        : [
            {
              meta: {
                index: logsDataView.id,
                alias: null,
                negate: false,
                disabled: false,
                type: 'phrase',
                key: 'action_id',
                params: { query: actionId },
              },
              query: { match_phrase: { action_id: actionId } },
              $state: { store: FilterStateStore.APP_STATE },
            },
          ];

      const defaultFrom = isScheduled ? 'now-7d' : 'now-1d';

      const newUrl = await locator.getUrl({
        indexPatternId: logsDataView.id,
        filters,
        refreshInterval: {
          pause: true,
          value: 0,
        },
        timeRange:
          startDate && endDate
            ? {
                to: endDate,
                from: startDate,
                mode: mode ?? 'absolute',
              }
            : {
                to: 'now',
                from: defaultFrom,
                mode: 'relative',
              },
      });
      setDiscoverUrl(newUrl);
    };

    getDiscoverUrl();
  }, [actionId, endDate, executionCount, mode, scheduleId, startDate, locator, logsDataView]);

  return {
    canDiscover: Boolean(discoverPermissions.show),
    discoverUrl,
  };
};
