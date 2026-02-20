/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  formatDate,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';

import { removeMultilines } from '../../common/utils/build_query/remove_multilines';
import { useRouterNavigate } from '../common/lib/kibana';
import type { UnifiedHistoryRow } from '../../common/api/unified_history/types';

interface HistoryDetailsButtonProps {
  row: UnifiedHistoryRow;
}

const HistoryDetailsButton: React.FC<HistoryDetailsButtonProps> = ({ row }) => {
  const path =
    row.rowType === 'scheduled'
      ? `history/scheduled/${row.scheduleId}/${row.executionCount}`
      : `history/${row.actionId}`;

  const navProps = useRouterNavigate(path);

  const detailsText = i18n.translate('xpack.osquery.unifiedHistory.table.viewDetailsButton', {
    defaultMessage: 'Details',
  });

  return (
    <EuiToolTip position="top" content={detailsText} disableScreenReaderOutput>
      <EuiButtonIcon iconType="visTable" {...navProps} aria-label={detailsText} />
    </EuiToolTip>
  );
};

HistoryDetailsButton.displayName = 'HistoryDetailsButton';

export const useUnifiedHistoryColumns = () => {
  const { push } = useHistory();

  const renderQueryColumn = useCallback((_: unknown, row: UnifiedHistoryRow) => {
    const singleLine = removeMultilines(row.queryText || '');
    const content = singleLine.length > 90 ? `${singleLine.substring(0, 90)}...` : singleLine;

    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow>
          {row.queryName ? (
            content ? (
              <EuiToolTip position="top" content={content}>
                <span>{row.queryName}</span>
              </EuiToolTip>
            ) : (
              <span>{row.queryName}</span>
            )
          ) : (
            <EuiCodeBlock language="sql" fontSize="s" paddingSize="none" transparentBackground>
              {content}
            </EuiCodeBlock>
          )}
        </EuiFlexItem>
        {row.packName && (
          <EuiFlexItem grow={false}>
            {row.rowType === 'live' ? (
              <EuiToolTip position="top" content={row.packName}>
                <EuiBadge color="hollow" iconType="package" />
              </EuiToolTip>
            ) : (
              <EuiBadge color="hollow" iconType="package">
                {row.packName}
              </EuiBadge>
            )}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }, []);

  const renderSourceColumn = useCallback((_: unknown, row: UnifiedHistoryRow) => {
    const colorMap: Record<string, string> = {
      Live: 'primary',
      Scheduled: 'accent',
      Rule: 'warning',
    };

    return <EuiBadge color={colorMap[row.source] ?? 'default'}>{row.source}</EuiBadge>;
  }, []);

  const renderAgentsColumn = useCallback(
    (_: unknown, row: UnifiedHistoryRow) => <>{row.agentCount}</>,
    []
  );

  const renderResultsColumn = useCallback(
    (_: unknown, row: UnifiedHistoryRow) => <>{row.totalRows ?? '-'}</>,
    []
  );

  const renderTimestampColumn = useCallback(
    (_: unknown, row: UnifiedHistoryRow) => <>{formatDate(row.timestamp)}</>,
    []
  );

  const renderRunByColumn = useCallback(
    (_: unknown, row: UnifiedHistoryRow) => <>{row.userId ?? '-'}</>,
    []
  );

  const renderActionsColumn = useCallback(
    (row: UnifiedHistoryRow) => <HistoryDetailsButton row={row} />,
    []
  );

  const isPlayAvailable = useCallback((row: UnifiedHistoryRow) => row.rowType === 'live', []);

  const handlePlayClick = useCallback(
    (row: UnifiedHistoryRow) => () => {
      if (row.actionId) {
        push('/new', {
          form: { query: row.queryText },
        });
      }
    },
    [push]
  );

  const renderPlayButton = useCallback(
    (row: UnifiedHistoryRow, enabled: boolean) => {
      const playText = i18n.translate('xpack.osquery.unifiedHistory.table.runQueryAriaLabel', {
        defaultMessage: 'Run query',
      });

      return (
        <EuiToolTip position="top" content={playText} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="play"
            onClick={handlePlayClick(row)}
            isDisabled={!enabled}
            aria-label={playText}
          />
        </EuiToolTip>
      );
    },
    [handlePlayClick]
  );

  const columns: Array<EuiBasicTableColumn<UnifiedHistoryRow>> = useMemo(
    () => [
      {
        field: 'queryText',
        name: i18n.translate('xpack.osquery.unifiedHistory.table.queryColumnTitle', {
          defaultMessage: 'Query',
        }),
        truncateText: true,
        width: '45%',
        render: renderQueryColumn,
      },
      {
        field: 'source',
        name: i18n.translate('xpack.osquery.unifiedHistory.table.sourceColumnTitle', {
          defaultMessage: 'Source',
        }),
        width: '100px',
        render: renderSourceColumn,
      },
      {
        field: 'agentCount',
        name: i18n.translate('xpack.osquery.unifiedHistory.table.agentsColumnTitle', {
          defaultMessage: 'Agents',
        }),
        width: '80px',
        render: renderAgentsColumn,
      },
      {
        field: 'totalRows',
        name: i18n.translate('xpack.osquery.unifiedHistory.table.resultsColumnTitle', {
          defaultMessage: 'Results',
        }),
        width: '80px',
        render: renderResultsColumn,
      },
      {
        field: 'timestamp',
        name: i18n.translate('xpack.osquery.unifiedHistory.table.timestampColumnTitle', {
          defaultMessage: 'Timestamp',
        }),
        width: '200px',
        render: renderTimestampColumn,
      },
      {
        field: 'userId',
        name: i18n.translate('xpack.osquery.unifiedHistory.table.runByColumnTitle', {
          defaultMessage: 'Run by',
        }),
        width: '150px',
        render: renderRunByColumn,
      },
      {
        name: i18n.translate('xpack.osquery.unifiedHistory.table.actionsColumnTitle', {
          defaultMessage: 'Actions',
        }),
        width: '120px',
        actions: [
          {
            available: isPlayAvailable,
            render: renderPlayButton,
          },
          {
            render: renderActionsColumn,
          },
        ],
      },
    ],
    [
      isPlayAvailable,
      renderActionsColumn,
      renderAgentsColumn,
      renderPlayButton,
      renderQueryColumn,
      renderResultsColumn,
      renderRunByColumn,
      renderSourceColumn,
      renderTimestampColumn,
    ]
  );

  return columns;
};
