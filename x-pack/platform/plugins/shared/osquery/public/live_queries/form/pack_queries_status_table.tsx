/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, map } from 'lodash';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  EuiBasicTable,
  EuiCodeBlock,
  EuiButtonIcon,
  EuiToolTip,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  RIGHT_ALIGNMENT,
  EuiBadge,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment-timezone';
import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import { QueryDetailsFlyout } from './query_details_flyout';
import { PackResultsHeader } from './pack_results_header';
import { Direction } from '../../../common/search_strategy';
import { removeMultilines } from '../../../common/utils/build_query/remove_multilines';
import { ResultTabs } from '../../routes/saved_queries/edit/tabs';
import type { PackItem } from '../../packs/types';
import { PackViewInLensAction } from '../../lens/pack_view_in_lens';
import { PackViewInDiscoverAction } from '../../discover/pack_view_in_discover';
import { AddToCaseWrapper } from '../../cases/add_to_cases';
import { AddToTimelineButton } from '../../timelines/add_to_timeline_button';
import { TagsColumn } from '../../actions/components/tags_column';
import { RowKebabMenu } from './row_kebab_menu';
import { useIsExperimentalFeatureEnabled } from '../../common/experimental_features_context';
import type { AddToTimelineHandler } from '../../types';

const truncateTooltipTextCss = {
  width: '100%',

  '> span': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
};

const euiFlexItemCss = {
  cursor: 'pointer',
};

const euiFlexItemWithMinWidthCss = {
  minWidth: 0,
  ...euiFlexItemCss,
};

// TODO fix types
const euiBasicTableCss = {
  '.euiTableRow.euiTableRow-isExpandedRow > td > div': {
    border: '1px solid #d3dae6',
  },

  '.euiTableRow.euiTableRow-isExpandedRow .euiTableCellContent': {
    paddingLeft: 0,
    paddingRight: 0,
  },

  'div.euiDataGrid__virtualized::-webkit-scrollbar': {
    display: 'none',
  },

  '.euiDataGrid > div': {
    '.euiDataGrid__scrollOverlay': {
      boxShadow: 'none',
    },

    borderLeft: '0px',
    borderRight: '0px',
  },
};

const EMPTY_ARRAY: PackQueryStatusItem[] = [];

export enum ViewResultsActionButtonType {
  icon = 'icon',
  button = 'button',
}

interface DocsColumnResultsProps {
  count?: number;
  isLive?: boolean;
}

const DocsColumnResults: React.FC<DocsColumnResultsProps> = ({ count, isLive }) => (
  <EuiFlexGroup gutterSize="s" alignItems="center">
    <EuiFlexItem grow={false}>
      {count ? <EuiNotificationBadge color="subdued">{count}</EuiNotificationBadge> : '-'}
    </EuiFlexItem>
    {!isLive ? (
      <EuiFlexItem grow={false} data-test-subj={'live-query-loading'}>
        <EuiLoadingSpinner />
      </EuiFlexItem>
    ) : null}
  </EuiFlexGroup>
);

interface AgentsColumnResultsProps {
  successful?: number;
  pending?: number;
  failed?: number;
}

const AgentsColumnResults: React.FC<AgentsColumnResultsProps> = ({
  successful,
  pending,
  failed,
}) => (
  <EuiFlexGroup gutterSize="s" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiText color="subdued">
        <EuiBadge color="success">{successful}</EuiBadge>
        {' / '}
        <EuiBadge color="default">{pending}</EuiBadge>
        {' / '}
        <EuiBadge color={failed ? 'danger' : 'default'}>{failed}</EuiBadge>
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

type PackQueryStatusItem = Partial<{
  action_id: string;
  id: string;
  query: string;
  agents: string[];
  ecs_mapping?: ECSMapping;
  version?: string;
  platform?: string;
  saved_query_id?: string;
  status?: string;
  pending?: number;
  docs?: number;
  error?: string;
}>;

interface PackQueriesStatusTableProps {
  agentIds?: string[];
  queryId?: string;
  actionId: string | undefined;
  data?: PackQueryStatusItem[];
  startDate?: string;
  expirationDate?: string;
  showResultsHeader?: boolean;
  addToTimeline?: AddToTimelineHandler;
  scheduleId?: string;
  executionCount?: number;
  packName?: string;
  tags?: string[];
}

const PackQueriesStatusTableComponent: React.FC<PackQueriesStatusTableProps> = ({
  actionId,
  queryId,
  agentIds,
  data,
  startDate,
  expirationDate,
  showResultsHeader,
  addToTimeline,
  scheduleId,
  executionCount,
  packName,
  tags,
}) => {
  const isHistoryEnabled = useIsExperimentalFeatureEnabled('queryHistoryRework');
  const [queryDetailsFlyoutOpen, setQueryDetailsFlyoutOpen] = useState<{
    id: string;
    query: string;
  } | null>(null);
  const handleQueryFlyoutOpen = useCallback(
    (item: any) => () => {
      setQueryDetailsFlyoutOpen(item);
    },
    []
  );
  const handleQueryFlyoutClose = useCallback(() => setQueryDetailsFlyoutOpen(null), []);

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<
    Record<string, React.ReactNode>
  >({});
  const renderIDColumn = useCallback(
    (id: string) => (
      <div css={truncateTooltipTextCss}>
        <EuiToolTip content={id} display="block">
          <span tabIndex={0}>{id}</span>
        </EuiToolTip>
      </div>
    ),
    []
  );

  const renderQueryColumn = useCallback(
    (query: string, item: any) => {
      const singleLine = removeMultilines(query);
      const content = singleLine.length > 55 ? `${singleLine.substring(0, 55)}...` : singleLine;

      const queryContent = (
        <EuiCodeBlock language="sql" fontSize="s" paddingSize="none" transparentBackground>
          {content}
        </EuiCodeBlock>
      );

      if (scheduleId && packName) {
        return (
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            wrap={false}
            justifyContent="spaceBetween"
          >
            <EuiFlexItem
              grow={true}
              css={euiFlexItemWithMinWidthCss}
              onClick={handleQueryFlyoutOpen(item)}
            >
              {queryContent}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge iconType="package" color="hollow">
                {packName}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      }

      return (
        <EuiFlexItem css={euiFlexItemCss} onClick={handleQueryFlyoutOpen(item)}>
          {queryContent}
        </EuiFlexItem>
      );
    },
    [handleQueryFlyoutOpen, scheduleId, packName]
  );

  const renderDocsColumn = useCallback((item: PackQueryStatusItem) => {
    const isLive =
      !item?.status || !!item.error || (item?.status !== 'running' && item?.pending === 0);

    return <DocsColumnResults count={item?.docs ?? 0} isLive={isLive} />;
  }, []);

  const renderAgentsColumn = useCallback((item: any) => {
    if (!item.action_id) return;

    return (
      <AgentsColumnResults
        successful={item?.successful ?? 0}
        pending={item?.pending ?? 0}
        failed={item?.failed ?? 0}
      />
    );
  }, []);

  // These renderers intentionally ignore the row item — the value is the same
  // for all rows since it comes from the parent execution context, not per-query data.
  const renderRunAtColumn = useCallback(
    () => (startDate ? <EuiText size="s">{moment(startDate).format('lll')}</EuiText> : null),
    [startDate]
  );

  const renderExecutionCountColumn = useCallback(
    () =>
      scheduleId && executionCount != null ? <EuiText size="s">{executionCount}</EuiText> : null,
    [scheduleId, executionCount]
  );

  const renderTagsColumn = useCallback(
    () => (tags && tags.length > 0 ? <TagsColumn tags={tags} /> : <>{'\u2014'}</>),
    [tags]
  );

  const renderDiscoverResultsAction = useCallback(
    (item: any) => (
      <PackViewInDiscoverAction
        item={item}
        scheduleId={scheduleId}
        executionCount={executionCount}
        timestamp={scheduleId ? startDate : undefined}
      />
    ),
    [scheduleId, executionCount, startDate]
  );

  const renderLensResultsAction = useCallback(
    (item: any) => (
      <PackViewInLensAction
        item={item}
        scheduleId={scheduleId}
        executionCount={executionCount}
        timestamp={scheduleId ? startDate : undefined}
      />
    ),
    [scheduleId, executionCount, startDate]
  );

  const getHandleErrorsToggle = useCallback(
    (item: any) => () => {
      setItemIdToExpandedRowMap((prevValue) => {
        const itemIdToExpandedRowMapValues = { ...prevValue };
        if (itemIdToExpandedRowMapValues[item.id]) {
          delete itemIdToExpandedRowMapValues[item.id];
        } else {
          itemIdToExpandedRowMapValues[item.id] = (
            <EuiFlexGroup gutterSize="xl">
              <EuiFlexItem>
                <ResultTabs
                  liveQueryActionId={actionId}
                  actionId={item.action_id}
                  startDate={startDate}
                  ecsMapping={item.ecs_mapping}
                  endDate={expirationDate}
                  agentIds={agentIds}
                  failedAgentsCount={item?.failed ?? 0}
                  error={item.error}
                  addToTimeline={addToTimeline}
                  scheduleId={scheduleId}
                  executionCount={executionCount}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        }

        return itemIdToExpandedRowMapValues;
      });
    },
    [actionId, startDate, expirationDate, agentIds, addToTimeline, scheduleId, executionCount]
  );

  const renderToggleResultsAction = useCallback(
    (item: any) =>
      item?.action_id && data?.length && data.length > 1 ? (
        <EuiButtonIcon
          data-test-subj={`toggleIcon-${item.id}`}
          onClick={getHandleErrorsToggle(item)}
          iconType={itemIdToExpandedRowMap[item.id] ? 'chevronSingleUp' : 'chevronSingleDown'}
          aria-label={i18n.translate('xpack.osquery.pack.queriesTable.toggleResultsAriaLabel', {
            defaultMessage: 'Toggle results',
          })}
        />
      ) : (
        <></>
      ),
    [data, getHandleErrorsToggle, itemIdToExpandedRowMap]
  );

  const getItemId = useCallback((item: PackItem) => get(item, 'id'), []) as unknown as string;

  const renderResultActions = useCallback(
    (row: PackQueryStatusItem) => {
      if (isHistoryEnabled) {
        return (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>{renderDiscoverResultsAction(row)}</EuiFlexItem>
            <EuiFlexItem grow={false}>{renderLensResultsAction(row)}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <RowKebabMenu
                row={row}
                actionId={actionId}
                agentIds={agentIds}
                addToTimeline={addToTimeline}
                scheduleId={scheduleId}
                executionCount={executionCount}
                onViewQuery={handleQueryFlyoutOpen(row)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      }

      // Legacy layout: inline action buttons without kebab menu
      const resultActions = [
        { render: renderDiscoverResultsAction },
        { render: renderLensResultsAction },
        {
          render: (item: PackQueryStatusItem) =>
            item.action_id && (
              <AddToTimelineButton
                field="action_id"
                value={item.action_id}
                isIcon={true}
                addToTimeline={addToTimeline}
              />
            ),
        },
        {
          render: (item: PackQueryStatusItem) =>
            actionId && (
              <AddToCaseWrapper
                actionId={actionId}
                agentIds={agentIds}
                queryId={item.action_id}
                isIcon={true}
                isDisabled={!item.action_id}
                scheduleId={scheduleId}
                executionCount={executionCount}
              />
            ),
        },
        {
          render: (item: PackQueryStatusItem) => (
            <EuiButtonIcon
              iconType={'expand'}
              onClick={handleQueryFlyoutOpen(item)}
              aria-label={i18n.translate('xpack.osquery.pack.queriesTable.viewQueryAriaLabel', {
                defaultMessage: 'View query',
              })}
            />
          ),
        },
      ];

      return resultActions.map((action) => action.render(row));
    },
    [
      isHistoryEnabled,
      actionId,
      addToTimeline,
      agentIds,
      executionCount,
      handleQueryFlyoutOpen,
      renderDiscoverResultsAction,
      renderLensResultsAction,
      scheduleId,
    ]
  );

  const renderActionsColumn = useCallback(
    (row: PackQueryStatusItem) => (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        {data && data.length > 1 && (
          <EuiFlexItem grow={false}>{renderToggleResultsAction(row)}</EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>{renderResultActions(row)}</EuiFlexItem>
      </EuiFlexGroup>
    ),
    [data, renderResultActions, renderToggleResultsAction]
  );

  const columns = useMemo(
    () => [
      {
        field: 'id',
        name: i18n.translate('xpack.osquery.pack.queriesTable.idColumnTitle', {
          defaultMessage: 'ID',
        }),
        width: '15%',
        render: renderIDColumn,
      },
      {
        field: 'query',
        name: i18n.translate('xpack.osquery.pack.queriesTable.queryColumnTitle', {
          defaultMessage: 'Query',
        }),
        render: renderQueryColumn,
        width: '40%',
      },
      ...(isHistoryEnabled && !scheduleId && tags
        ? [
            {
              field: '',
              name: i18n.translate('xpack.osquery.pack.queriesTable.tagsColumnTitle', {
                defaultMessage: 'Tags',
              }),
              width: '100px',
              render: renderTagsColumn,
            },
          ]
        : []),
      {
        field: '',
        name: i18n.translate('xpack.osquery.pack.queriesTable.docsResultsColumnTitle', {
          defaultMessage: 'Docs',
        }),
        width: '80px',
        render: renderDocsColumn,
      },
      {
        field: '',
        name: i18n.translate('xpack.osquery.pack.queriesTable.agentsResultsColumnTitle', {
          defaultMessage: 'Agents',
        }),
        width: '160px',
        render: renderAgentsColumn,
      },
      ...(isHistoryEnabled && startDate
        ? [
            {
              field: '',
              name: i18n.translate('xpack.osquery.pack.queriesTable.runAtColumnTitle', {
                defaultMessage: 'Run at',
              }),
              width: '180px',
              render: renderRunAtColumn,
            },
          ]
        : []),
      ...(isHistoryEnabled && scheduleId && executionCount != null
        ? [
            {
              field: '',
              name: i18n.translate('xpack.osquery.pack.queriesTable.executionCountColumnTitle', {
                defaultMessage: 'Execution count',
              }),
              width: '120px',
              render: renderExecutionCountColumn,
            },
          ]
        : []),
      ...(isHistoryEnabled
        ? [
            {
              field: '',
              name: i18n.translate('xpack.osquery.pack.queriesTable.actionsColumnTitle', {
                defaultMessage: 'Actions',
              }),
              width: '120px',
              render: renderActionsColumn,
            },
          ]
        : [
            {
              field: '',
              name: i18n.translate('xpack.osquery.pack.queriesTable.viewResultsColumnTitle', {
                defaultMessage: 'View results',
              }),
              width: '120px',
              render: renderResultActions,
            },
            {
              field: '',
              id: 'actions',
              width: '45px',
              isVisuallyHiddenLabel: true,
              alignment: RIGHT_ALIGNMENT,
              actions: [
                {
                  render: renderToggleResultsAction,
                },
              ],
            },
          ]),
    ],
    [
      isHistoryEnabled,
      renderIDColumn,
      renderQueryColumn,
      renderDocsColumn,
      renderAgentsColumn,
      renderRunAtColumn,
      renderExecutionCountColumn,
      renderTagsColumn,
      renderActionsColumn,
      renderResultActions,
      renderToggleResultsAction,
      startDate,
      scheduleId,
      executionCount,
      tags,
    ]
  );
  const sorting = useMemo(
    () => ({
      sort: {
        field: 'id' as const,
        direction: Direction.asc,
      },
    }),
    []
  );

  useEffect(() => {
    // reset the expanded row map when the data changes
    setItemIdToExpandedRowMap({});
  }, [queryId, actionId]);

  useEffect(() => {
    const shouldAutoExpand =
      data?.length === 1 &&
      (agentIds?.length || scheduleId) &&
      data?.[0].id &&
      !itemIdToExpandedRowMap[data?.[0].id];

    if (shouldAutoExpand) {
      getHandleErrorsToggle(data?.[0])();
    }
  }, [agentIds?.length, data, getHandleErrorsToggle, itemIdToExpandedRowMap, scheduleId]);

  const queryIds = useMemo(() => map(data, (query) => query.action_id), [data]);

  return (
    <>
      {showResultsHeader && (
        <PackResultsHeader
          queryIds={queryIds as string[]}
          actionId={actionId}
          agentIds={agentIds}
          addToTimeline={addToTimeline}
          isScheduled={!!scheduleId}
        />
      )}
      <EuiBasicTable
        css={euiBasicTableCss}
        tableCaption={i18n.translate('xpack.osquery.pack.queriesTable.tableCaption', {
          defaultMessage: 'Pack queries',
        })}
        items={data ?? EMPTY_ARRAY}
        itemId={getItemId}
        columns={columns}
        sorting={sorting}
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      />
      {queryDetailsFlyoutOpen ? (
        <QueryDetailsFlyout onClose={handleQueryFlyoutClose} action={queryDetailsFlyoutOpen} />
      ) : null}
    </>
  );
};

export const PackQueriesStatusTable = React.memo(PackQueriesStatusTableComponent);
