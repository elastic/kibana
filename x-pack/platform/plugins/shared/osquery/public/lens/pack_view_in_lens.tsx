/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { usePackQueryLastResults } from '../packs/use_pack_query_last_results';
import { ViewResultsActionButtonType } from '../live_queries/form/pack_queries_status_table';
import { ViewResultsInLensAction } from './view_results_in_lens';
import { getPackViewDateWindow } from '../common/pack_view_date_window';

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
const PackViewInLensActionComponent: React.FC<PackViewInActionProps> = ({
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

  const { startDate, endDate, mode } = getPackViewDateWindow({
    isScheduled,
    timestamp,
    lastResultTime: lastResultsData?.lastResultTime,
    interval,
  });

  return (
    <ViewResultsInLensAction
      actionId={actionId}
      buttonType={ViewResultsActionButtonType.icon}
      startDate={startDate}
      endDate={endDate}
      mode={mode}
      scheduleId={scheduleId}
      executionCount={executionCount}
    />
  );
};

export const PackViewInLensAction = React.memo(PackViewInLensActionComponent);
