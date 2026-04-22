/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { CoreStart, useService } from '@kbn/core-di-browser';
import type { ExecutionSummary } from '../../services/rule_doctor_api';
import { useFetchExecutions } from '../../hooks/use_fetch_executions';
import type { useExecutionStream } from '../../hooks/use_execution_stream';
import { ruleDoctorExecutionKeys } from '../../hooks/query_key_factory';

const STATUS_BADGE_COLORS: Record<string, string> = {
  pending: 'hollow',
  waiting: 'primary',
  waiting_for_input: 'primary',
  running: 'primary',
  completed: 'success',
  failed: 'danger',
  timed_out: 'warning',
  cancelled: 'default',
  skipped: 'default',
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
};

const formatDuration = (ms: number | null): string => {
  if (ms == null) return '-';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
};

interface ExecutionsTabProps {
  executionStream: ReturnType<typeof useExecutionStream>;
}

export const ExecutionsTab = ({ executionStream }: ExecutionsTabProps) => {
  const history = useHistory();
  const queryClient = useQueryClient();
  const { basePath } = useService(CoreStart('http'));
  const { data: fetchedExecutions, isLoading, isError, error } = useFetchExecutions();
  const { executions: streamedExecutions, isStreaming } = executionStream;

  const unsorted = streamedExecutions ?? fetchedExecutions;
  const executions = unsorted
    ? [...unsorted].sort(
        (a, b) =>
          new Date(b.startedAt ?? 0).getTime() - new Date(a.startedAt ?? 0).getTime()
      )
    : unsorted;

  const wasStreamingRef = useRef(false);
  useEffect(() => {
    if (isStreaming) {
      wasStreamingRef.current = true;
    } else if (wasStreamingRef.current) {
      wasStreamingRef.current = false;
      queryClient.invalidateQueries(ruleDoctorExecutionKeys.lists());
    }
  }, [isStreaming, queryClient]);

  const INSIGHT_TYPE_COLORS: Record<string, string> = {
    deduplication: '#F5A623',
    threshold_tuning: '#9B59B6',
    stale_rule: '#E74C3C',
    coverage_gap: '#2980B9',
  };

  const columns: Array<EuiBasicTableColumn<ExecutionSummary>> = [
    {
      field: 'insightLabel',
      name: i18n.translate('xpack.alertingV2.ruleDoctor.executions.typeColumn', {
        defaultMessage: 'Type',
      }),
      width: '160px',
      render: (_: string, item: ExecutionSummary) => (
        <EuiBadge color={INSIGHT_TYPE_COLORS[item.insightType] ?? 'default'}>
          {item.insightLabel ?? item.insightType ?? 'Unknown'}
        </EuiBadge>
      ),
    },
    {
      field: 'dataViewName',
      name: i18n.translate('xpack.alertingV2.ruleDoctor.executions.dataViewColumn', {
        defaultMessage: 'Data View',
      }),
      render: (_: string | null, item: ExecutionSummary) => {
        if (!item.dataViewName) return '-';
        if (!item.dataViewId) return item.dataViewName;
        const href = basePath.prepend(
          `/app/management/kibana/dataViews/dataView/${encodeURIComponent(item.dataViewId)}`
        );
        return (
          <EuiLink
            href={href}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {item.dataViewName}
          </EuiLink>
        );
      },
    },
    {
      field: 'status',
      name: i18n.translate('xpack.alertingV2.ruleDoctor.executions.statusColumn', {
        defaultMessage: 'Status',
      }),
      width: '120px',
      render: (status: string) => (
        <EuiBadge color={STATUS_BADGE_COLORS[status] ?? 'default'}>{status}</EuiBadge>
      ),
    },
    {
      field: 'startedAt',
      name: i18n.translate('xpack.alertingV2.ruleDoctor.executions.startedAtColumn', {
        defaultMessage: 'Started',
      }),
      render: formatDate,
      sortable: true,
    },
    {
      field: 'durationMs',
      name: i18n.translate('xpack.alertingV2.ruleDoctor.executions.durationColumn', {
        defaultMessage: 'Duration',
      }),
      width: '100px',
      render: formatDuration,
    },
  ];

  if (isLoading) {
    return (
      <EuiEmptyPrompt
        icon={<EuiLoadingSpinner size="xl" />}
        title={
          <h2>
            {i18n.translate('xpack.alertingV2.ruleDoctor.executions.loadingTitle', {
              defaultMessage: 'Loading executions...',
            })}
          </h2>
        }
      />
    );
  }

  return (
    <>
      {isError && (
        <>
          <EuiCallOut
            title={i18n.translate('xpack.alertingV2.ruleDoctor.executions.errorTitle', {
              defaultMessage: 'Error',
            })}
            color="danger"
            iconType="error"
          >
            <p>{error instanceof Error ? error.message : 'Failed to load executions'}</p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      {!executions?.length ? (
        <EuiEmptyPrompt
          iconType="clock"
          title={
            <h2>
              {i18n.translate('xpack.alertingV2.ruleDoctor.executions.emptyTitle', {
                defaultMessage: 'No executions yet',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.alertingV2.ruleDoctor.executions.emptyBody', {
                defaultMessage:
                  'Click "Run analysis" to start your first Rule Doctor analysis.',
              })}
            </p>
          }
        />
      ) : (
        <EuiBasicTable
          items={executions}
          columns={columns}
          rowProps={(item) => ({
            onClick: () =>
              history.push(`/doctor/executions/${encodeURIComponent(item.id)}`),
            style: { cursor: 'pointer' },
          })}
        />
      )}
    </>
  );
};
