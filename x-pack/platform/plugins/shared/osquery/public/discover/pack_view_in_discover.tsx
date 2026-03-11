/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment-timezone';
import { usePackQueryLastResults } from '../packs/use_pack_query_last_results';
import { ViewResultsActionButtonType } from '../live_queries/form/pack_queries_status_table';
import { ViewResultsInDiscoverAction } from './view_results_in_discover';

interface PackViewInActionProps {
  item: {
    id: string;
    interval: number;
    action_id?: string;
    agents: string[];
  };
  actionId?: string;
  scheduleId?: string;
  executionCount?: number;
  timestamp?: string;
}
const PackViewInDiscoverActionComponent: React.FC<PackViewInActionProps> = ({
  item,
  scheduleId,
  executionCount,
  timestamp,
}) => {
  const isScheduled = !!scheduleId;
  const { action_id: actionId, interval } = item;
  const { data: lastResultsData } = usePackQueryLastResults({
    actionId,
    interval,
    skip: isScheduled,
  });

  const startDate = isScheduled
    ? timestamp
      ? moment(timestamp).subtract(1, 'hour').toISOString()
      : undefined
    : lastResultsData?.lastResultTime
    ? moment(lastResultsData.lastResultTime[0]).subtract(interval, 'seconds').toISOString()
    : `now-${interval}s`;
  const endDate = isScheduled
    ? timestamp
      ? moment(timestamp).add(1, 'hour').toISOString()
      : undefined
    : lastResultsData?.lastResultTime
    ? moment(lastResultsData.lastResultTime[0]).toISOString()
    : 'now';

  return (
    <ViewResultsInDiscoverAction
      actionId={actionId}
      buttonType={ViewResultsActionButtonType.icon}
      startDate={startDate}
      endDate={endDate}
      mode={
        isScheduled
          ? timestamp
            ? 'absolute'
            : undefined
          : lastResultsData?.lastResultTime
          ? 'absolute'
          : 'relative'
      }
      scheduleId={scheduleId}
      executionCount={executionCount}
    />
  );
};

export const PackViewInDiscoverAction = React.memo(PackViewInDiscoverActionComponent);
