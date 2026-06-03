/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';
import { EuiCallOut, EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { AGENTS_INDEX, AGENTS_PREFIX, FLEET_ROUTING_PATHS } from '../../constants';
import { DefaultLayout } from '../../layouts';
import { useBreadcrumbs } from '../../hooks';

import { SearchBar } from '../../components/search_bar';

import { CollectorGroupsTable } from './components/collector_groups_table';
import { CollectorsTable } from './components/collectors_table';
import { CollectorsStatusBar } from './components/collectors_status_bar';
import { useCollectorGroups, useCollectorsList } from './hooks';
import { useCollectorsUrlFilters, useSetCollectorsUrlFilters } from './hooks/use_url_filters';

const REFRESH_INTERVAL_MS = 30000;

const CollectorsListPage: React.FC = () => {
  useBreadcrumbs('collectors');

  const [isAutoRefreshOn, setIsAutoRefreshOn] = useState(true);
  const { kuery, groupBy, expandedGroups } = useCollectorsUrlFilters();
  const setUrlFilters = useSetCollectorsUrlFilters();
  const [draftKuery, setDraftKuery] = useState(kuery ?? '');

  useEffect(() => {
    setDraftKuery(kuery ?? '');
  }, [kuery]);

  const isGrouped = groupBy !== 'none';
  const refetchInterval = isAutoRefreshOn ? REFRESH_INTERVAL_MS : false;

  const collectorsList = useCollectorsList({ refetchInterval, enabled: !isGrouped });
  const collectorGroups = useCollectorGroups({
    groupBy,
    refetchInterval,
    enabled: isGrouped,
  });

  const handleGroupByChange = useCallback(
    (value: string) => {
      setUrlFilters({
        groupBy: value,
        pageIndex: 0,
        groupPage: 0,
        groupAfterKey: undefined,
        expandedGroups: [],
      });
    },
    [setUrlFilters]
  );

  const handleSearchChange = useCallback(
    (newSearch: string, submit?: boolean) => {
      setDraftKuery(newSearch);
      if (submit) {
        setUrlFilters({
          kuery: newSearch.trim() || undefined,
          pageIndex: 0,
          groupPage: 0,
          groupAfterKey: undefined,
          expandedGroups: [],
        });
      }
    },
    [setUrlFilters]
  );

  const handleToggleGroup = useCallback(
    (groupKey: string) => {
      const next = expandedGroups.includes(groupKey)
        ? expandedGroups.filter((k) => k !== groupKey)
        : [...expandedGroups, groupKey];
      setUrlFilters({ expandedGroups: next }, { replace: true });
    },
    [expandedGroups, setUrlFilters]
  );

  const isInitialLoading = isGrouped
    ? collectorGroups.isInitialLoading
    : collectorsList.isInitialLoading;
  const isError = isGrouped ? collectorGroups.isError : collectorsList.isError;
  const error = isGrouped ? collectorGroups.error : collectorsList.error;
  const dataUpdatedAt = isGrouped ? collectorGroups.dataUpdatedAt : collectorsList.dataUpdatedAt;
  const isEmpty = isGrouped
    ? collectorGroups.groups.length === 0
    : collectorsList.collectors.length === 0;
  const totalCount = isGrouped ? collectorGroups.groups.length : collectorsList.totalCount;

  return (
    <DefaultLayout section="collectors">
      <EuiSpacer size="m" />
      {isError ? (
        <EuiCallOut
          color="danger"
          iconType="error"
          announceOnMount
          title={
            <FormattedMessage
              id="xpack.fleet.collectors.errorTitle"
              defaultMessage="Unable to load collectors"
            />
          }
        >
          {error instanceof Error ? error.message : undefined}
        </EuiCallOut>
      ) : (
        <>
          {!isInitialLoading && (
            <>
              <CollectorsStatusBar
                totalCount={totalCount}
                dataUpdatedAt={dataUpdatedAt}
                isAutoRefreshOn={isAutoRefreshOn}
                onAutoRefreshChange={setIsAutoRefreshOn}
                selectedGroupBy={groupBy}
                onGroupByChange={handleGroupByChange}
              />
              <EuiSpacer size="m" />
              <SearchBar
                value={draftKuery}
                fieldPrefix={AGENTS_PREFIX}
                indexPattern={AGENTS_INDEX}
                onChange={handleSearchChange}
                dataTestSubj="fleetCollectors.queryInput"
              />
            </>
          )}
          <EuiSpacer size="m" />
          {!isInitialLoading && isEmpty ? (
            <EuiEmptyPrompt
              iconType="compute"
              title={
                <FormattedMessage
                  id="xpack.fleet.collectors.emptyTitle"
                  defaultMessage="No collectors enrolled"
                />
              }
              body={
                <FormattedMessage
                  id="xpack.fleet.collectors.emptyBody"
                  defaultMessage="There are no OTel collectors enrolled yet."
                />
              }
            />
          ) : isGrouped ? (
            <CollectorGroupsTable
              groups={collectorGroups.groups}
              groupBy={groupBy}
              expandedGroups={expandedGroups}
              onToggleGroup={handleToggleGroup}
              isLoading={collectorGroups.isLoading}
              pageIndex={collectorGroups.pageIndex}
              hasNextPage={collectorGroups.hasNextPage}
              onNextPage={collectorGroups.onNextPage}
              onPreviousPage={collectorGroups.onPreviousPage}
            />
          ) : (
            <CollectorsTable
              collectors={collectorsList.collectors}
              isLoading={collectorsList.isLoading}
              totalCount={collectorsList.totalCount}
              pageIndex={collectorsList.pageIndex}
              pageSize={collectorsList.pageSize}
              onTableChange={collectorsList.onTableChange}
            />
          )}
        </>
      )}
    </DefaultLayout>
  );
};

export const CollectorsApp: React.FunctionComponent = () => {
  return (
    <Routes>
      <Route path={FLEET_ROUTING_PATHS.collectors}>
        <CollectorsListPage />
      </Route>
    </Routes>
  );
};
