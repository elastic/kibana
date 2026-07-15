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

export const Main: FunctionComponent = () => {
  const {
    services: { dataSourcesClient, datasetsClient },
  } = useKibana<DataFederationKibanaServices>();

  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [hasLoadedDataSources, setHasLoadedDataSources] = useState(false);
  const [hasLoadedDataSets, setHasLoadedDataSets] = useState(false);
  const [selectedTabId, setSelectedTabId] = useState<'sets' | 'sources'>('sets');
  const [hasUserSelectedTab, setHasUserSelectedTab] = useState(false);
  const [dataSets, setDataSets] = useState<DataSetWithName[]>([]);

  const loadDataSources = useCallback(
    async ({ signal }: { signal?: AbortSignal } = {}) => {
      try {
        const nextItems = await dataSourcesClient.get();
        if (!signal?.aborted) {
          setDataSources(nextItems);
        }
      } catch {
        if (!signal?.aborted) {
          setDataSources([]);
        }
      } finally {
        if (!signal?.aborted) {
          setHasLoadedDataSources(true);
        }
      }
    },
    [dataSourcesClient]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadDataSources({ signal: controller.signal });
    return () => {
      controller.abort();
    };
  }, [loadDataSources]);

  const loadDataSets = useCallback(
    async ({ signal }: { signal?: AbortSignal } = {}) => {
      try {
        const nextItems = await datasetsClient.get();
        if (!signal?.aborted) {
          setDataSets(nextItems);
        }
      } catch {
        if (!signal?.aborted) {
          setDataSets([]);
        }
      } finally {
        if (!signal?.aborted) {
          setHasLoadedDataSets(true);
        }
      }
    },
    [datasetsClient]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadDataSets({ signal: controller.signal });
    return () => {
      controller.abort();
    };
  }, [loadDataSets]);

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
            loadDataSets={() => loadDataSets()}
          />
        ),
      },
      {
        id: 'sources',
        name: mainTranslations.tabs.sources,
        content: (
          <DataSourcesTabContent
            items={dataSources}
            dataSets={dataSets}
            loadDataSources={() => loadDataSources()}
          />
        ),
      },
    ],
    [dataSources, loadDataSets, loadDataSources, dataSets]
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
