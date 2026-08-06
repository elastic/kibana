/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Redirect, useHistory, useLocation } from 'react-router-dom';
import { EuiSpacer, EuiText } from '@elastic/eui';

import { Routes, Route } from '@kbn/shared-ux-router';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AppHeader, type AppHeaderTab } from '@kbn/app-header';
import type { DataSetWithName, DataSource } from '../common';
import { mainTranslations } from './main_i18n';
import { DataSourcesTabContent } from './data_sources_tab_content';
import { DatasetsTabContent } from './datasets_tab_content';
import type { DataFederationKibanaServices } from './types';
import { useLoadList } from './use_load_list';

const DOCS_LINK =
  'https://www.elastic.co/docs/reference/query-languages/esql/esql-data-federation' as const;

const DATASETS_PATH = '/datasets' as const;
const DATA_SOURCES_PATH = '/data_sources' as const;

export const Main: FunctionComponent = () => {
  const {
    services: { dataSourcesClient, datasetsClient },
  } = useKibana<DataFederationKibanaServices>();

  const history = useHistory();
  const { pathname } = useLocation();

  const {
    items: dataSources,
    hasLoaded: hasLoadedDataSources,
    reload: reloadDataSources,
  } = useLoadList<DataSource>(
    useCallback(async () => await dataSourcesClient.get(), [dataSourcesClient])
  );

  const {
    items: dataSets,
    hasLoaded: hasLoadedDataSets,
    reload: reloadDataSets,
  } = useLoadList<DataSetWithName>(
    useCallback(async () => await datasetsClient.get(), [datasetsClient])
  );

  const selectedTabId = useMemo<'datasets' | 'data_sources'>(() => {
    return pathname.startsWith(DATA_SOURCES_PATH) ? 'data_sources' : 'datasets';
  }, [pathname]);
  const [hasUserSelectedTab, setHasUserSelectedTab] = useState(false);

  useEffect(() => {
    if (hasUserSelectedTab || !hasLoadedDataSources || !hasLoadedDataSets) {
      return;
    }

    if (dataSources.length === 0 && dataSets.length === 0 && selectedTabId !== 'data_sources') {
      history.replace(DATA_SOURCES_PATH);
    }
  }, [
    dataSets.length,
    history,
    hasLoadedDataSets,
    hasLoadedDataSources,
    hasUserSelectedTab,
    dataSources.length,
    selectedTabId,
  ]);

  const onTabClick = useCallback(
    (id: 'datasets' | 'sources') => {
      setHasUserSelectedTab(true);
      history.push(id === 'sources' ? DATA_SOURCES_PATH : DATASETS_PATH);
    },
    [history]
  );

  const tabs = useMemo<AppHeaderTab[]>(
    () => [
      {
        id: 'datasets',
        label: mainTranslations.tabs.sets,
        isSelected: selectedTabId === 'datasets',
        onClick: () => onTabClick('datasets'),
        'data-test-subj': 'dataFederationDatasetsTab',
      },
      {
        id: 'sources',
        label: mainTranslations.tabs.sources,
        isSelected: selectedTabId === 'data_sources',
        onClick: () => onTabClick('sources'),
        'data-test-subj': 'dataFederationDataSourcesTab',
      },
    ],
    [onTabClick, selectedTabId]
  );

  return (
    <>
      <AppHeader
        title={mainTranslations.pageTitle}
        badges={[{ label: mainTranslations.experimental }]}
        tabs={tabs}
        spacing="bleed"
        docLink={DOCS_LINK}
      />
      <EuiSpacer size="l" />

      <EuiText color="subdued" size="s">
        <p>{mainTranslations.pageDescription}</p>
      </EuiText>
      <EuiSpacer size="m" />

      <Routes>
        <Route
          exact
          path={DATASETS_PATH}
          render={() => (
            <DatasetsTabContent
              dataSources={dataSources}
              dataSets={dataSets}
              loadDataSets={reloadDataSets}
            />
          )}
        />
        <Route
          exact
          path={DATA_SOURCES_PATH}
          render={() => (
            <DataSourcesTabContent
              dataSources={dataSources}
              dataSets={dataSets}
              loadDataSources={reloadDataSources}
            />
          )}
        />
        <Redirect exact from="/" to={DATASETS_PATH} />
        <Redirect to={DATASETS_PATH} />
      </Routes>
    </>
  );
};
