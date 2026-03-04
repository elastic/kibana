/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, pickBy, isNumber } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTextColor,
  EuiToolTip,
  formatDate,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';

import { QUERY_TIMEOUT } from '../../common/constants';
import { removeMultilines } from '../../common/utils/build_query/remove_multilines';
import { useRouterNavigate } from '../common/lib/kibana';
import { RunByColumn } from './components/run_by_column';
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

interface UseUnifiedHistoryColumnsOptions {
  permissions: Record<string, boolean | Record<string, boolean>>;
  existingPackIds: string[];
  profilesMap: Map<string, UserProfileWithAvatar>;
  isLoadingProfiles: boolean;
}

export const useUnifiedHistoryColumns = ({
  permissions,
  existingPackIds,
  profilesMap,
  isLoadingProfiles,
}: UseUnifiedHistoryColumnsOptions) => {
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
                <span tabIndex={0}>{row.queryName}</span>
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
                <EuiBadge tabIndex={0} color="hollow" iconType="package" />
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

  const renderAgentsColumn = useCallback((_: unknown, row: UnifiedHistoryRow) => {
    if (row.successCount == null) {
      return <>{row.agentCount}</>;
    }

    if (row.rowType === 'scheduled') {
      return (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="check" color="success" size="m" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTextColor color="success">{row.agentCount}</EuiTextColor>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="check" color="success" size="m" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTextColor color="success">{row.successCount}</EuiTextColor>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type="cross" color="danger" size="m" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTextColor color="danger">{row.errorCount ?? 0}</EuiTextColor>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, []);

  const renderResultsColumn = useCallback((_: unknown, row: UnifiedHistoryRow) => {
    if (row.totalRows == null) return <>{'\u2014'}</>;

    if (row.packId && row.queriesTotal != null) {
      return (
        <>
          {row.queriesWithResults ?? 0} of {row.queriesTotal}
        </>
      );
    }

    return <>{row.totalRows}</>;
  }, []);

  const renderTimestampColumn = useCallback(
    (_: unknown, row: UnifiedHistoryRow) => <>{formatDate(row.timestamp)}</>,
    []
  );

  const renderRunByColumn = useCallback(
    (_: unknown, row: UnifiedHistoryRow) => (
      <RunByColumn
        userId={row.userId}
        userProfileUid={row.userProfileUid}
        profilesMap={profilesMap}
        isLoadingProfiles={isLoadingProfiles}
      />
    ),
    [profilesMap, isLoadingProfiles]
  );

  const renderActionsColumn = useCallback(
    (row: UnifiedHistoryRow) => <HistoryDetailsButton row={row} />,
    []
  );

  const isPlayAvailable = useCallback(
    (row: UnifiedHistoryRow) => {
      if (row.rowType !== 'live') return false;

      if (row.packId) {
        return (
          existingPackIds.includes(row.packId) &&
          !!permissions.runSavedQueries &&
          !!permissions.readPacks
        );
      }

      return !!(permissions.runSavedQueries || permissions.writeLiveQueries);
    },
    [permissions, existingPackIds]
  );

  const handlePlayClick = useCallback(
    (row: UnifiedHistoryRow) => () => {
      const newQueryPath = '/new';

      if (row.packId) {
        return push(newQueryPath, {
          form: pickBy(
            {
              packId: row.packId,
              agentSelection: {
                agents: row.agentIds,
                allAgentsSelected: row.agentAll,
                platformsSelected: row.agentPlatforms,
                policiesSelected: row.agentPolicyIds,
              },
            },
            (value) => !isEmpty(value)
          ),
        });
      }

      push(newQueryPath, {
        form: pickBy(
          {
            query: row.queryText,
            ecs_mapping: row.ecsMapping,
            savedQueryId: row.savedQueryId,
            timeout: row.timeout ?? QUERY_TIMEOUT.DEFAULT,
            agentSelection: {
              agents: row.agentIds,
              allAgentsSelected: row.agentAll,
              platformsSelected: row.agentPlatforms,
              policiesSelected: row.agentPolicyIds,
            },
          },
          (value) => !isEmpty(value) || isNumber(value)
        ),
      });
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
        width: '100px',
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
