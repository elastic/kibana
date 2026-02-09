/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray, isEmpty, pickBy, map, isNumber, compact, uniq, flatMap } from 'lodash';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiCodeBlock,
  formatDate,
  EuiIcon,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSkeletonText,
  EuiToolTip,
  EuiBadge,
  EuiAvatar,
  EuiText,
  EuiFieldSearch,
  EuiSpacer,
  EuiFilterGroup,
  EuiFilterButton,
  EuiPopover,
  EuiSelectable,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { UserAvatar, getUserDisplayName } from '@kbn/user-profile-components';
import React, { useState, useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';

import { QUERY_TIMEOUT } from '../../common/constants';
import { removeMultilines } from '../../common/utils/build_query/remove_multilines';
import { useAllLiveQueries } from './use_all_live_queries';
import { useBulkGetCases } from './use_bulk_get_cases';
import { useBulkGetUserProfiles } from './use_bulk_get_user_profiles';
import { useUniqueUsers } from './use_unique_users';
import type { SearchHit, ActionDetails } from '../../common/search_strategy';
import { useRouterNavigate, useKibana } from '../common/lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../common/experimental_features_context';
import { usePacks } from '../packs/use_packs';

const EMPTY_ARRAY: SearchHit[] = [];

interface ActionTableResultsButtonProps {
  actionId: string;
}

const ActionTableResultsButton: React.FC<ActionTableResultsButtonProps> = ({ actionId }) => {
  const navProps = useRouterNavigate(`live_queries/${actionId}`);

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

const ActionsTableComponent = () => {
  const permissions = useKibana().services.application.capabilities.osquery;
  const isHistoryEnabled = useIsExperimentalFeatureEnabled('queryHistoryRework');
  const { push } = useHistory();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = useState('');
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);
  const [isUserFilterOpen, setIsUserFilterOpen] = useState(false);

  useDebounce(
    () => {
      setDebouncedSearchValue(searchValue);
      setPageIndex(0);
    },
    300,
    [searchValue]
  );

  const kuery = useMemo(() => {
    if (!isHistoryEnabled) return 'user_id: *';

    const parts: string[] = [];

    if (debouncedSearchValue.trim()) {
      const escaped = debouncedSearchValue.trim().replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      parts.push(`(queries.query: ${escaped}* OR pack_name: ${escaped}*)`);
    }

    if (selectedUserUid) {
      parts.push(`user_profile_uid: "${selectedUserUid}"`);
    }

    return parts.length > 0 ? parts.join(' AND ') : undefined;
  }, [isHistoryEnabled, debouncedSearchValue, selectedUserUid]);

  const { data: packsData } = usePacks({});

  const { data: uniqueUsersData } = useUniqueUsers(isHistoryEnabled);

  const uniqueUserUids = useMemo(
    () => uniqueUsersData?.map((u) => u.profile_uid) ?? [],
    [uniqueUsersData]
  );

  const { data: uniqueUserProfilesMap } = useBulkGetUserProfiles(uniqueUserUids);

  const {
    data: actionsData,
    isLoading,
    isFetching,
  } = useAllLiveQueries({
    activePage: pageIndex,
    limit: pageSize,
    kuery,
    withResultCounts: isHistoryEnabled,
  });

  const items = actionsData?.data?.items ?? EMPTY_ARRAY;

  const caseIds = useMemo(() => {
    if (!isHistoryEnabled) return [];
    return uniq(
      compact(flatMap(items, (item: SearchHit) => (item._source as ActionDetails)?.case_ids))
    );
  }, [isHistoryEnabled, items]);

  const profileUids = useMemo(() => {
    if (!isHistoryEnabled) return [];
    return uniq(
      compact(items.map((item: SearchHit) => (item._source as ActionDetails)?.user_profile_uid))
    );
  }, [isHistoryEnabled, items]);

  const { data: casesMap } = useBulkGetCases(caseIds);
  const { data: userProfilesMap } = useBulkGetUserProfiles(profileUids);

  const onTableChange = useCallback(({ page = {} }: any) => {
    const { index, size } = page;

    setPageIndex(index);
    setPageSize(size);
  }, []);

  const renderQueryColumn = useCallback((_: any, item: any) => {
    if (item._source.pack_name) {
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="package" />
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

  const renderAgentsColumn = useCallback(
    (_: any, item: any) => <>{item.fields.agents?.length ?? 0}</>,
    []
  );

  const renderCreatedByColumn = useCallback(
    (userId: any) => (isArray(userId) ? userId[0] : '-'),
    []
  );

  const renderTimestampColumn = useCallback(
    (_: any, item: any) => <>{formatDate(item.fields['@timestamp'][0])}</>,
    []
  );

  const renderActionsColumn = useCallback(
    (item: any) => <ActionTableResultsButton actionId={item.fields.action_id[0]} />,
    []
  );

  const handlePlayClick = useCallback(
    (item: any) => () => {
      const packId = item._source.pack_id;

      if (packId) {
        return push('/live_queries/new', {
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

      push('/live_queries/new', {
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

  const renderResultsColumn = useCallback((_: unknown, item: SearchHit) => {
    const action = item._source as ActionDetails;
    const counts = action?.result_counts;
    if (!counts) return <>-</>;

    if (action.pack_id && counts.queries_total != null) {
      return <>{counts.queries_with_results ?? 0} of {counts.queries_total}</>;
    }

    return <>{counts.total_rows ?? 0}</>;
  }, []);

  const renderHistoryAgentsColumn = useCallback((_: unknown, item: SearchHit) => {
    const action = item._source as ActionDetails;
    const counts = action?.result_counts;
    if (!counts || counts.successful_agents == null) {
      const agentCount = item.fields?.agents?.length ?? action?.agents?.length ?? 0;

      return <>{agentCount}</>;
    }

    return (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="success">{counts.successful_agents}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">x</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color={counts.error_agents ? 'danger' : 'subdued'}>
            {counts.error_agents ?? 0}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, []);

  const renderSourceColumn = useCallback((_: unknown, item: SearchHit) => {
    const action = item._source as ActionDetails;
    if (action?.user_id) {
      return <EuiBadge color="hollow">Manual</EuiBadge>;
    }

    return <EuiBadge color="hollow">Rule</EuiBadge>;
  }, []);

  const renderCasesColumn = useCallback((_: unknown, item: SearchHit) => {
    const action = item._source as ActionDetails;
    const actionCaseIds = action?.case_ids;
    if (!actionCaseIds?.length || !casesMap) return <>-</>;

    const caseNames = actionCaseIds
      .map((id) => casesMap.get(id)?.title)
      .filter(Boolean);

    if (caseNames.length === 0) return <>-</>;
    if (caseNames.length === 1) return <>{caseNames[0]}</>;

    return (
      <EuiToolTip content={caseNames.join(', ')}>
        <>{caseNames[0]} +{caseNames.length - 1}</>
      </EuiToolTip>
    );
  }, [casesMap]);

  const renderRunByColumn = useCallback((_: unknown, item: SearchHit) => {
    const action = item._source as ActionDetails;
    const profileUid = action?.user_profile_uid;
    const userId = action?.user_id;

    if (profileUid && userProfilesMap?.get(profileUid)) {
      const profile = userProfilesMap.get(profileUid)!;
      const displayName = getUserDisplayName(profile.user);

      return (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <UserAvatar user={profile.user} avatar={profile.data?.avatar} size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{displayName}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (userId) {
      const initials = userId.substring(0, 2).toUpperCase();

      return (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiAvatar name={userId} initials={initials} size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{userId}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return <>-</>;
  }, [userProfilesMap]);

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

  const historyColumns = useMemo(
    () => [
      {
        name: i18n.translate('xpack.osquery.history.table.actionsColumnTitle', {
          defaultMessage: 'Actions',
        }),
        width: '80px',
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
      {
        field: 'query',
        name: i18n.translate('xpack.osquery.history.table.queryColumnTitle', {
          defaultMessage: 'Pack or query',
        }),
        truncateText: true,
        width: '30%',
        render: renderQueryColumn,
      },
      {
        field: 'results',
        name: i18n.translate('xpack.osquery.history.table.resultsColumnTitle', {
          defaultMessage: 'Results',
        }),
        width: '100px',
        render: renderResultsColumn,
      },
      {
        field: 'source',
        name: i18n.translate('xpack.osquery.history.table.sourceColumnTitle', {
          defaultMessage: 'Source',
        }),
        width: '100px',
        render: renderSourceColumn,
      },
      {
        field: 'cases',
        name: i18n.translate('xpack.osquery.history.table.casesColumnTitle', {
          defaultMessage: 'Cases',
        }),
        width: '120px',
        render: renderCasesColumn,
      },
      {
        field: 'agents',
        name: i18n.translate('xpack.osquery.history.table.agentsColumnTitle', {
          defaultMessage: 'Agents',
        }),
        width: '120px',
        render: renderHistoryAgentsColumn,
      },
      {
        field: 'created_at',
        name: i18n.translate('xpack.osquery.history.table.createdAtColumnTitle', {
          defaultMessage: 'Created at',
        }),
        width: '200px',
        render: renderTimestampColumn,
      },
      {
        field: 'run_by',
        name: i18n.translate('xpack.osquery.history.table.runByColumnTitle', {
          defaultMessage: 'Run by',
        }),
        width: '180px',
        render: renderRunByColumn,
      },
    ],
    [
      isPlayButtonAvailable,
      renderActionsColumn,
      renderCasesColumn,
      renderHistoryAgentsColumn,
      renderPlayButton,
      renderQueryColumn,
      renderResultsColumn,
      renderRunByColumn,
      renderSourceColumn,
      renderTimestampColumn,
    ]
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
        field: 'agents',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.agentsColumnTitle', {
          defaultMessage: 'Agents',
        }),
        width: '100px',
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
        render: renderCreatedByColumn,
      },
      {
        name: i18n.translate('xpack.osquery.liveQueryActions.table.viewDetailsColumnTitle', {
          defaultMessage: 'View details',
        }),
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
      renderCreatedByColumn,
      renderPlayButton,
      renderQueryColumn,
      renderTimestampColumn,
    ]
  );

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount: actionsData?.data?.total ?? 0,
      pageSizeOptions: [20, 50, 100],
    }),
    [actionsData, pageIndex, pageSize]
  );

  const rowProps = useCallback(
    (data: any) => ({
      'data-test-subj': `row-${data._source.action_id}`,
    }),
    []
  );

  const userFilterOptions: EuiSelectableOption[] = useMemo(() => {
    if (!uniqueUsersData || !uniqueUserProfilesMap) return [];

    return uniqueUsersData.map((u) => {
      const profile = uniqueUserProfilesMap.get(u.profile_uid);
      const label = profile ? getUserDisplayName(profile.user) : u.profile_uid;

      return {
        key: u.profile_uid,
        label: `${label} (${u.query_count})`,
        checked: selectedUserUid === u.profile_uid ? 'on' : undefined,
      };
    });
  }, [uniqueUsersData, uniqueUserProfilesMap, selectedUserUid]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const handleUserFilterChange = useCallback(
    (options: EuiSelectableOption[]) => {
      const selected = options.find((o) => o.checked === 'on');
      setSelectedUserUid(selected?.key ?? null);
      setPageIndex(0);
      setIsUserFilterOpen(false);
    },
    []
  );

  const hasActiveFilters = !!selectedUserUid || !!debouncedSearchValue.trim();

  const handleClearFilters = useCallback(() => {
    setSearchValue('');
    setDebouncedSearchValue('');
    setSelectedUserUid(null);
    setPageIndex(0);
  }, []);

  if (isLoading) {
    return <EuiSkeletonText lines={10} />;
  }

  const activeColumns = isHistoryEnabled ? historyColumns : columns;

  return (
    <>
      {isHistoryEnabled && (
        <>
          <EuiFlexGroup gutterSize="m" alignItems="center">
            <EuiFlexItem grow>
              <EuiFieldSearch
                placeholder={i18n.translate('xpack.osquery.history.searchPlaceholder', {
                  defaultMessage: 'Search queries...',
                })}
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                isClearable
                fullWidth
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFilterGroup>
                <EuiPopover
                  button={
                    <EuiFilterButton
                      iconType="arrowDown"
                      onClick={() => setIsUserFilterOpen(!isUserFilterOpen)}
                      isSelected={isUserFilterOpen}
                      hasActiveFilters={!!selectedUserUid}
                      numActiveFilters={selectedUserUid ? 1 : 0}
                    >
                      {i18n.translate('xpack.osquery.history.runByFilter', {
                        defaultMessage: 'Run by',
                      })}
                    </EuiFilterButton>
                  }
                  isOpen={isUserFilterOpen}
                  closePopover={() => setIsUserFilterOpen(false)}
                  panelPaddingSize="none"
                >
                  <EuiSelectable
                    options={userFilterOptions}
                    singleSelection
                    onChange={handleUserFilterChange}
                  >
                    {(list) => <div style={{ width: 280 }}>{list}</div>}
                  </EuiSelectable>
                </EuiPopover>
              </EuiFilterGroup>
            </EuiFlexItem>
            {hasActiveFilters && (
              <EuiFlexItem grow={false}>
                <EuiFilterButton onClick={handleClearFilters} iconType="cross">
                  {i18n.translate('xpack.osquery.history.clearFilters', {
                    defaultMessage: 'Clear filters',
                  })}
                </EuiFilterButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </>
      )}
      <EuiBasicTable
        items={actionsData?.data?.items ?? EMPTY_ARRAY}
        loading={isFetching && !isLoading}
        // @ts-expect-error update types
        columns={activeColumns}
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

export const ActionsTable = React.memo(ActionsTableComponent);
ActionsTable.displayName = 'ActionsTable';
