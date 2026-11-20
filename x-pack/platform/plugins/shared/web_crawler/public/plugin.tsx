/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { dynamic } from '@kbn/shared-ux-utility';
import { WebCrawlerProvider } from './context';
import type {
  WebCrawlPanelProps,
  WebCrawlerConfig,
  WebCrawlerPublicStart,
  WebCrawlerSetupDependencies,
  WebCrawlerStartDependencies,
  WebCrawlsPageProps,
} from './types';

const LazyWebCrawlPanel = dynamic(async () => ({
  default: (await import('./components/web_crawl_panel')).WebCrawlPanel,
}));

const LazyWebCrawlsPage = dynamic(async () => ({
  default: (await import('./web_crawls_page')).WebCrawlsPage,
}));

export class WebCrawlerPlugin
  implements
    Plugin<void, WebCrawlerPublicStart, WebCrawlerSetupDependencies, WebCrawlerStartDependencies>
{
  public setup(core: CoreSetup, { workflowsExtensions }: WebCrawlerSetupDependencies) {
    workflowsExtensions?.registerStepDefinition(() =>
      import('./web_crawl_step').then(({ webCrawlStepDefinition }) => webCrawlStepDefinition)
    );
  }

  public start(core: CoreStart, deps: WebCrawlerStartDependencies): WebCrawlerPublicStart {
    const services = { ...core, ...deps };
    const queryClient = new QueryClient();

    const Providers = ({ config, children }: PropsWithChildren<{ config: WebCrawlerConfig }>) => (
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <WebCrawlerProvider services={services} config={config}>
            {children}
          </WebCrawlerProvider>
        </I18nProvider>
      </QueryClientProvider>
    );

    const WebCrawlPanel = (config: WebCrawlPanelProps) => (
      <Providers config={config}>
        <LazyWebCrawlPanel />
      </Providers>
    );

    const WebCrawlsPage = ({ onNavigateHome, ...config }: WebCrawlsPageProps) => (
      <Providers config={config}>
        <LazyWebCrawlsPage onNavigateHome={onNavigateHome} />
      </Providers>
    );

    return { WebCrawlPanel, WebCrawlsPage };
  }

  public stop() {}
}
