/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect, useMemo, useState } from 'react';
import { PackQueriesStatusTable } from '../../live_queries/form/pack_queries_status_table';
import { useLiveQueryDetails } from '../../actions/use_live_query_details';
import { useScheduledExecutionDetails } from '../../actions/use_scheduled_execution_details';

interface PackQueriesAttachmentWrapperProps {
  actionId: string;
  agentIds: string[];
  queryId: string;
  scheduleId?: string;
  executionCount?: number;
}

export const PackQueriesAttachmentWrapper = ({
  actionId,
  agentIds,
  queryId,
  scheduleId,
  executionCount,
}: PackQueriesAttachmentWrapperProps) => {
  const isScheduled = !!scheduleId && executionCount != null;
  const [isLive, setIsLive] = useState(false);

  const { data: liveData } = useLiveQueryDetails({
    actionId,
    isLive,
    skip: isScheduled,
    ...(queryId ? { queryIds: [queryId] } : {}),
  });

  const { data: scheduledData } = useScheduledExecutionDetails({
    scheduleId: scheduleId || '',
    executionCount: executionCount ?? 0,
    skip: !isScheduled,
  });

  useLayoutEffect(() => {
    if (!isScheduled) {
      setIsLive(() => !(liveData?.status === 'completed'));
    }
  }, [liveData?.status, isScheduled]);

  const scheduledQueryData = useMemo(() => {
    if (!scheduledData) return undefined;

    return [
      {
        action_id: scheduleId!,
        id: scheduledData.queryName || scheduleId!,
        query: scheduledData.queryText || '',
        agents: [],
        status: 'completed' as const,
        docs: scheduledData.totalRows,
        successful: scheduledData.successCount,
        failed: scheduledData.errorCount,
        pending: 0,
      },
    ];
  }, [scheduledData, scheduleId]);

  if (isScheduled) {
    return (
      <CasesAttachmentWrapperContext.Provider value={true}>
        <PackQueriesStatusTable
          actionId={scheduleId!}
          data={scheduledQueryData}
          scheduleId={scheduleId}
          executionCount={executionCount}
        />
      </CasesAttachmentWrapperContext.Provider>
    );
  }

  return (
    <CasesAttachmentWrapperContext.Provider value={true}>
      <PackQueriesStatusTable
        actionId={actionId}
        queryId={queryId}
        data={liveData?.queries}
        startDate={liveData?.['@timestamp']}
        expirationDate={liveData?.expiration}
        agentIds={agentIds}
      />
    </CasesAttachmentWrapperContext.Provider>
  );
};

export const CasesAttachmentWrapperContext = React.createContext(false);
