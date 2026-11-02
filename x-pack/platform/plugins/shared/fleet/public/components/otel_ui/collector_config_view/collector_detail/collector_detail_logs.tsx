/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSuperDatePicker } from '@elastic/eui';
import { LazySavedSearchComponent } from '@kbn/saved-search-component';
import useAsync from 'react-use/lib/useAsync';

import { useStartServices } from '../../../../hooks';

const AGENT_LOG_INDEX_PATTERN = 'logs-elastic_agent-*,logs-elastic_agent.*-*';

interface CollectorDetailLogsProps {
  agentId: string;
}

export const CollectorDetailLogs: React.FC<CollectorDetailLogsProps> = ({ agentId }) => {
  const {
    logsDataAccess: {
      services: { logSourcesService },
    },
    embeddable,
    data: {
      search: { searchSource },
      dataViews,
    },
  } = useStartServices();

  const logSources = useAsync(logSourcesService.getFlattenedLogSources);

  const [start, setStart] = useState('now-1d');
  const [end, setEnd] = useState('now');

  const onTimeChange = useCallback(
    ({ start: newStart, end: newEnd }: { start: string; end: string }) => {
      setStart(newStart);
      setEnd(newEnd);
    },
    []
  );

  const logStreamQuery = useMemo(
    () => ({
      language: 'kuery' as const,
      query: `elastic_agent.id:${agentId}`,
    }),
    [agentId]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false} style={{ maxWidth: 312 }}>
            <EuiSuperDatePicker
              showUpdateButton={false}
              start={start}
              end={end}
              onTimeChange={onTimeChange}
              compressed
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel paddingSize="none" grow={false}>
          {logSources.value ? (
            <LazySavedSearchComponent
              dependencies={{ embeddable, searchSource, dataViews }}
              index={logSources.value ?? AGENT_LOG_INDEX_PATTERN}
              timeRange={{ from: start, to: end }}
              query={logStreamQuery}
              height="40vh"
              displayOptions={{
                enableDocumentViewer: true,
                enableFilters: false,
              }}
              columns={['@timestamp', 'event.dataset', 'component.id', 'message', 'error.message']}
            />
          ) : null}
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
