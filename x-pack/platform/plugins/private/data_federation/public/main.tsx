/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { EuiTabbedContentTab } from '@elastic/eui';
import {
  EuiBetaBadge,
  EuiLink,
  EuiPageHeader,
  EuiPageSection,
  EuiTabbedContent,
} from '@elastic/eui';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataSetWithName, DataSource } from '../common';
import { mainTranslations } from './main_i18n';
import { DataSourcesTabContent } from './data_sources_tab_content';
import { DatasetsTabContent } from './datasets_tab_content';
import type { DataFederationKibanaServices } from './types';
import { useLoadList } from './use_load_list';

export const Main: FunctionComponent = () => {
  const {
    services: { dataSourcesClient, datasetsClient },
  } = useKibana<DataFederationKibanaServices>();

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

  const [selectedTabId, setSelectedTabId] = useState<'sets' | 'sources'>('sets');
  const [hasUserSelectedTab, setHasUserSelectedTab] = useState(false);

  useEffect(() => {
    if (hasUserSelectedTab || !hasLoadedDataSources || !hasLoadedDataSets) {
      return;
    }

    if (dataSources.length === 0 && dataSets.length === 0) {
      setSelectedTabId('sources');
    }
  }, [
    dataSets.length,
    hasLoadedDataSets,
    hasLoadedDataSources,
    hasUserSelectedTab,
    dataSources.length,
  ]);

  const tabs = useMemo<EuiTabbedContentTab[]>(
    () => [
      {
        id: 'sets',
        name: mainTranslations.tabs.sets,
        content: (
          <DatasetsTabContent
            dataSources={dataSources}
            dataSets={dataSets}
            loadDataSets={reloadDataSets}
          />
        ),
      },
      {
        id: 'sources',
        name: mainTranslations.tabs.sources,
        content: (
          <DataSourcesTabContent
            dataSources={dataSources}
            dataSets={dataSets}
            loadDataSources={reloadDataSources}
          />
        ),
      },
    ],
    [dataSources, dataSets, reloadDataSets, reloadDataSources]
  );

  const selectedTab = useMemo(
    () => tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0],
    [selectedTabId, tabs]
  );

  return (
    <>
      <EuiPageHeader
        bottomBorder
        pageTitle={
          <>
            <span data-test-subj="dataSetsPageTitle">{mainTranslations.pageTitle}</span>
            &nbsp;
            <EuiBetaBadge label={mainTranslations.technicalPreview} size="m" />
          </>
        }
        description={
          <>
            {mainTranslations.pageDescription}{' '}
            <EuiLink
              href="https://www.elastic.co/docs/reference/query-languages/esql/esql-data-federation"
              target="_blank"
            >
              {mainTranslations.docsLink}
            </EuiLink>
          </>
        }
      />
      <EuiPageSection paddingSize="m">
        <EuiTabbedContent
          tabs={tabs}
          selectedTab={selectedTab}
          onTabClick={(tab) => {
            setHasUserSelectedTab(true);
            setSelectedTabId(tab.id === 'sources' ? 'sources' : 'sets');
          }}
          autoFocus="initial"
          data-test-subj="dataSetsTabs"
        />
      </EuiPageSection>
    </>
  );
};
