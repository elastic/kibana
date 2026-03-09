/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, pickBy, map, isNumber } from 'lodash';
import { i18n } from '@kbn/i18n';

import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiCodeBlock,
  formatDate,
  EuiIcon,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
  EuiTextColor,
  EuiSkeletonText,
  EuiToolTip,
  type CriteriaWithPagination,
} from '@elastic/eui';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useHistory } from 'react-router-dom';

import { QUERY_TIMEOUT } from '../../common/constants';
import type { PackResultCounts } from '../../common/search_strategy';
import { removeMultilines } from '../../common/utils/build_query/remove_multilines';
import { useAllLiveQueries } from './use_all_live_queries';
import { useBulkGetUserProfiles } from './use_user_profiles';
import type { ActionDetails, SearchHit } from '../../common/search_strategy';
import { useRouterNavigate, useKibana } from '../common/lib/kibana';
import { usePacks } from '../packs/use_packs';
import { usePersistedPageSize, PAGE_SIZE_OPTIONS } from '../common/use_persisted_page_size';
import { RunByColumn } from './components/run_by_column';
import { HistoryFilters } from './components/history_filters';
import { SourceColumn } from './components/source_column';
import { buildHistoryKuery } from './utils/build_history_kuery';

const EMPTY_ARRAY: SearchHit[] = [];

interface ActionTableResultsButtonProps {
  actionId: string;
}

const ActionTableResultsButton: React.FC<ActionTableResultsButtonProps> = ({ actionId }) => {
  const navProps = useRouterNavigate(`history/${actionId}`);

  const detailsText = i18n.translate(
    'xpack.osquery.liveQueryActions.table.viewDetailsActionButton',
    {
      defaultMessage: 'Details',
    }
  );

  return (
    <EuiToolTip position="top" content={detailsText} disableScreenReaderOutput>
      <EuiButtonIcon iconType="visTable" {...navProps} aria-label={detailsText} />
    </EuiToolTip>
  );
};

ActionTableResultsButton.displayName = 'ActionTableResultsButton';

const SEARCH_DEBOUNCE_MS = 400;

const UnifiedHistoryTableComponent = () => {
  const permissions = useKibana().services.application.capabilities.osquery;
  const { push } = useHistory();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize();

  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchValue(searchValue), SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchValue]);

  const kuery = useMemo(
    () =>
      buildHistoryKuery({
        searchTerm: debouncedSearchValue,
        selectedUserIds,
      }),
    [debouncedSearchValue, selectedUserIds]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    setPageIndex(0);
  }, []);

  const handleSelectedUsersChanged = useCallback((userIds: string[]) => {
    setSelectedUserIds(userIds);
    setPageIndex(0);
  }, []);

  const { data: packsData } = usePacks({});

  const {
    data: actionsData,
    isLoading,
    isFetching,
  } = useAllLiveQueries({
    activePage: pageIndex,
    limit: pageSize,
    kuery,
    withResultCounts: true,
  });

  const actionItems = useMemo(
    () => actionsData?.data?.items ?? EMPTY_ARRAY,
    [actionsData?.data?.items]
  );

  const { profilesMap, isLoading: isLoadingProfiles } = useBulkGetUserProfiles(actionItems);

  const onTableChange = useCallback(
    ({ page }: CriteriaWithPagination<SearchHit>) => {
      setPageIndex(page.index);
      setPageSize(page.size);
    },
    [setPageSize]
  );

  const renderQueryColumn = useCallback((_: any, item: any) => {
    if (item._source.pack_name) {
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="package" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>{item._source.pack_name}</EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    const query = item._source.queries[0].query;
    const singleLine = removeMultilines(query);
    const content = singleLine.length > 90 ? `${singleLine?.substring(0, 90)}...` : singleLine;

    return (
      <EuiCodeBlock language="sql" fontSize="s" paddingSize="none" transparentBackground>
        {content}
      </EuiCodeBlock>
    );
  }, []);

  const renderAgentsColumn = useCallback((_: unknown, item: SearchHit) => {
    const action = item._source as ActionDetails | undefined;
    const counts = action?.result_counts;

    if (!counts || counts.successful_agents == null) {
      return <>{item.fields?.agents?.length ?? action?.agents?.length ?? 0}</>;
    }

    return (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="check" color="success" size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTextColor color="success">{counts.successful_agents}</EuiTextColor>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type="cross" color="danger" size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTextColor color="danger">{counts.error_agents ?? 0}</EuiTextColor>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, []);

  const renderRunByColumn = useCallback(
    (_: unknown, item: SearchHit) => {
      const userId = (item.fields?.user_id as string[] | undefined)?.[0];
      const userProfileUid = (item.fields?.user_profile_uid as string[] | undefined)?.[0];

      return (
        <RunByColumn
          userId={userId}
          userProfileUid={userProfileUid}
          profilesMap={profilesMap}
          isLoadingProfiles={isLoadingProfiles}
        />
      );
    },
    [profilesMap, isLoadingProfiles]
  );

  const renderSourceColumn = useCallback((_: unknown, item: SearchHit) => {
    const userId = (item.fields?.user_id as string[] | undefined)?.[0];

    return <SourceColumn userId={userId} />;
  }, []);

  const renderTimestampColumn = useCallback(
    (_: any, item: any) => <>{formatDate(item.fields['@timestamp'][0])}</>,
    []
  );

  const renderResultsColumn = useCallback((_: unknown, item: SearchHit) => {
    const action = item._source as ActionDetails | undefined;
    const counts = action?.result_counts;
    if (!counts) return <>{'\u2014'}</>;

    if (action?.pack_id && 'queries_total' in counts) {
      const packCounts = counts as PackResultCounts;

      return (
        <>
          {packCounts.queries_with_results} of {packCounts.queries_total}
        </>
      );
    }

    return <>{counts.total_rows}</>;
  }, []);

  const renderActionsColumn = useCallback(
    (item: any) => <ActionTableResultsButton actionId={item.fields.action_id[0]} />,
    []
  );

  const newQueryPath = '/new';

  const handlePlayClick = useCallback(
    (item: any) => () => {
      const packId = item._source.pack_id;

      if (packId) {
        return push(newQueryPath, {
          form: pickBy(
            {
              packId: item._source.pack_id,
              agentSelection: {
                agents: item._source.agent_ids,
                allAgentsSelected: item._source.agent_all,
                platformsSelected: item._source.agent_platforms,
                policiesSelected: item._source.agent_policy_ids,
              },
            },
            (value) => !isEmpty(value)
          ),
        });
      }

      push(newQueryPath, {
        form: pickBy(
          {
            query: item._source.queries[0].query,
            ecs_mapping: item._source.queries[0].ecs_mapping,
            savedQueryId: item._source.queries[0].saved_query_id,
            timeout: item._source.queries[0].timeout ?? QUERY_TIMEOUT.DEFAULT,
            agentSelection: {
              agents: item._source.agent_ids,
              allAgentsSelected: item._source.agent_all,
              platformsSelected: item._source.agent_platforms,
              policiesSelected: item._source.agent_policy_ids,
            },
          },
          (value) => !isEmpty(value) || isNumber(value)
        ),
      });
    },
    [push]
  );

  const renderPlayButton = useCallback(
    (item: any, enabled: any) => {
      const playText = i18n.translate('xpack.osquery.liveQueryActions.table.runActionAriaLabel', {
        defaultMessage: 'Run query',
      });

      return (
        <EuiToolTip position="top" content={playText} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="play"
            onClick={handlePlayClick(item)}
            isDisabled={!enabled}
            aria-label={playText}
          />
        </EuiToolTip>
      );
    },
    [handlePlayClick]
  );

  const existingPackIds = useMemo(() => map(packsData?.data ?? [], 'id'), [packsData]);

  const isPlayButtonAvailable = useCallback(
    (item: any) => {
      if (item.fields.pack_id?.length) {
        return (
          existingPackIds.includes(item.fields.pack_id[0]) &&
          permissions.runSavedQueries &&
          permissions.readPacks
        );
      }

      return !!(permissions.runSavedQueries || permissions.writeLiveQueries);
    },
    [permissions, existingPackIds]
  );

  const columns = useMemo(
    () => [
      {
        field: 'query',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.queryColumnTitle', {
          defaultMessage: 'Query',
        }),
        truncateText: true,
        width: '60%',
        render: renderQueryColumn,
      },
      {
        field: 'source',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.sourceColumnTitle', {
          defaultMessage: 'Source',
        }),
        width: '120px',
        render: renderSourceColumn,
      },
      {
        field: 'results',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.resultsColumnTitle', {
          defaultMessage: 'Results',
        }),
        width: '120px',
        render: renderResultsColumn,
      },
      {
        field: 'agents',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.agentsColumnTitle', {
          defaultMessage: 'Agents',
        }),
        width: '120px',
        render: renderAgentsColumn,
      },
      {
        field: 'created_at',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.createdAtColumnTitle', {
          defaultMessage: 'Created at',
        }),
        width: '200px',
        render: renderTimestampColumn,
      },
      {
        field: 'fields.user_id',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.createdByColumnTitle', {
          defaultMessage: 'Run by',
        }),
        width: '200px',
        render: renderRunByColumn,
      },
      {
        name: i18n.translate('xpack.osquery.liveQueryActions.table.viewDetailsColumnTitle', {
          defaultMessage: 'View details',
        }),
        width: '120px',
        actions: [
          {
            available: isPlayButtonAvailable,
            render: renderPlayButton,
          },
          {
            render: renderActionsColumn,
          },
        ],
      },
    ],
    [
      isPlayButtonAvailable,
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

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount: actionsData?.data?.total ?? 0,
      pageSizeOptions: [...PAGE_SIZE_OPTIONS],
    }),
    [actionsData, pageIndex, pageSize]
  );

  const rowProps = useCallback(
    (data: any) => ({
      'data-test-subj': `row-${data._source.action_id}`,
    }),
    []
  );

  if (isLoading) {
    return <EuiSkeletonText lines={10} />;
  }

  return (
    <>
      <HistoryFilters
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        selectedUserIds={selectedUserIds}
        onSelectedUsersChanged={handleSelectedUsersChanged}
      />
      <EuiSpacer size="m" />
      <EuiBasicTable
        items={actionItems}
        loading={isFetching && !isLoading}
        // @ts-expect-error update types
        columns={columns}
        pagination={pagination}
        onChange={onTableChange}
        rowProps={rowProps}
        data-test-subj="liveQueryActionsTable"
        tableCaption={i18n.translate('xpack.osquery.liveQueryActions.table.tableCaption', {
          defaultMessage: 'Live query actions',
        })}
      />
    </>
  );
};

export const UnifiedHistoryTable = React.memo(UnifiedHistoryTableComponent);
UnifiedHistoryTable.displayName = 'UnifiedHistoryTable';
