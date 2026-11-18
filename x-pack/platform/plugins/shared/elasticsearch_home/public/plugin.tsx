/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { dynamic } from '@kbn/shared-ux-utility';
import { ElasticsearchHomeProvider } from './context';
import type {
  ElasticsearchHomePageProps,
  ElasticsearchHomePublicStart,
  ElasticsearchHomeSetupDependencies,
  ElasticsearchHomeStartDependencies,
  WebCrawlsPageProps,
} from './types';

const LazyHomePage = dynamic(async () => ({
  default: (await import('./home_page')).HomePage,
}));

const LazyWebCrawlsPage = dynamic(async () => ({
  default: (await import('./web_crawls_page')).WebCrawlsPage,
}));

export class ElasticsearchHomePlugin
  implements
    Plugin<
      void,
      ElasticsearchHomePublicStart,
      ElasticsearchHomeSetupDependencies,
      ElasticsearchHomeStartDependencies
    >
{
  public setup(core: CoreSetup, { workflowsExtensions }: ElasticsearchHomeSetupDependencies) {
    workflowsExtensions?.registerStepDefinition(() =>
      import('./web_crawl_step').then(({ webCrawlStepDefinition }) => webCrawlStepDefinition)
    );
  }

  public start(
    core: CoreStart,
    deps: ElasticsearchHomeStartDependencies
  ): ElasticsearchHomePublicStart {
    const services = { ...core, ...deps };
    const queryClient = new QueryClient();

    const HomePage = (props: ElasticsearchHomePageProps) => (
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <ElasticsearchHomeProvider services={services} config={props}>
            <LazyHomePage />
          </ElasticsearchHomeProvider>
        </I18nProvider>
      </QueryClientProvider>
    );

    const WebCrawlsPage = ({ onNavigateHome, ...config }: WebCrawlsPageProps) => (
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <ElasticsearchHomeProvider services={services} config={{ ...config, addDataLinks: [] }}>
            <LazyWebCrawlsPage onNavigateHome={onNavigateHome} />
          </ElasticsearchHomeProvider>
        </I18nProvider>
      </QueryClientProvider>
    );

    return { HomePage, WebCrawlsPage };
  }

  public stop() {}
}
