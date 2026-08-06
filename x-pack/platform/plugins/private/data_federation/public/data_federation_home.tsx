/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiBetaBadge, EuiSpacer } from '@elastic/eui';
import { AppHeader, type AppHeaderBadge, type AppHeaderTab } from '@kbn/app-header';
import { useLocation } from 'react-router-dom';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataSetWithName, DataSource } from '../common';
import { mainTranslations } from './main_i18n';
import { DataSourcesTabContent } from './data_sources_tab_content';
import { DatasetsTabContent } from './datasets_tab_content';
import type { DataFederationKibanaServices } from './types';
import { useLoadList } from './use_load_list';

const DATA_FEDERATION_DOCS_URL =
  'https://www.elastic.co/docs/reference/query-languages/esql/esql-data-federation';

export const DataFederationHome: FunctionComponent = () => {
  const location = useLocation();
  const {
    services: { dataSourcesClient, datasetsClient },
  } = useKibana<DataFederationKibanaServices>();

  const {
    items: dataSources,
    reload: reloadDataSources,
  } = useLoadList<DataSource>(
    useCallback(async () => await dataSourcesClient.get(), [dataSourcesClient])
  );

  const {
    items: dataSets,
    reload: reloadDataSets,
  } = useLoadList<DataSetWithName>(
    useCallback(async () => await datasetsClient.get(), [datasetsClient])
  );

  const [selectedTabId, setSelectedTabId] = useState<'sets' | 'sources'>('sets');
  const [dataSourceFilter, setDataSourceFilter] = useState<string[]>([]);

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    if (tab === 'sources') {
      setSelectedTabId('sources');
    }
  }, [location.search]);

  const onTabClick = useCallback((tabId: 'sets' | 'sources') => {
    setSelectedTabId(tabId);
  }, []);

  const viewDataSetsForDataSource = useCallback((dataSourceName: string) => {
    setSelectedTabId('sets');
    setDataSourceFilter([dataSourceName]);
  }, []);

  const headerBadges = useMemo<AppHeaderBadge[]>(
    () => [
      {
        label: mainTranslations.experimental,
        renderCustomBadge: ({ badgeText }) => <EuiBetaBadge label={badgeText} size="m" />,
      },
    ],
    []
  );

  const headerTabs = useMemo<AppHeaderTab[]>(
    () => [
      {
        id: 'sets',
        label: mainTranslations.tabs.sets,
        isSelected: selectedTabId === 'sets',
        onClick: () => onTabClick('sets'),
        'data-test-subj': 'dataSetsTabs-sets',
      },
      {
        id: 'sources',
        label: mainTranslations.tabs.sources,
        isSelected: selectedTabId === 'sources',
        onClick: () => onTabClick('sources'),
        'data-test-subj': 'dataSetsTabs-sources',
      },
    ],
    [onTabClick, selectedTabId]
  );

  const tabContent = useMemo(() => {
    if (selectedTabId === 'sources') {
      return (
        <DataSourcesTabContent
          dataSources={dataSources}
          dataSets={dataSets}
          loadDataSources={reloadDataSources}
          onViewDataSetsForDataSource={viewDataSetsForDataSource}
        />
      );
    }

    return (
      <DatasetsTabContent
        dataSources={dataSources}
        dataSets={dataSets}
        loadDataSets={reloadDataSets}
        dataSourceFilter={dataSourceFilter}
        onDataSourceFilterChange={setDataSourceFilter}
      />
    );
  }, [dataSourceFilter, dataSources, dataSets, reloadDataSets, reloadDataSources, selectedTabId, viewDataSetsForDataSource]);

  return (
    <>
      <AppHeader
        title={mainTranslations.pageTitle}
        badges={headerBadges}
        description={{
          text: mainTranslations.pageDescription,
          learnMoreUrl: DATA_FEDERATION_DOCS_URL,
          fullWidth: true,
        }}
        tabs={headerTabs}
        spacing="bleed"
      />
      <EuiSpacer size="l" />
      {tabContent}
    </>
  );
};
