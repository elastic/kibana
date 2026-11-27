/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart, Plugin } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { dynamic } from '@kbn/shared-ux-utility';
import { HomePageLoading } from './components/home_page_loading';
import { ElasticsearchHomeProvider } from './context';
import { getIntegratedOnboardingEnabled$, useIntegratedOnboardingEnabled } from './feature_flags';
import type {
  ElasticsearchHomeAppProps,
  ElasticsearchHomePageProps,
  ElasticsearchHomePublicStart,
  ElasticsearchHomeStartDependencies,
} from './types';

const LazyHomePage = dynamic(async () => ({
  default: (await import('./home_page')).HomePage,
}));

const LazyHomeRoutes = dynamic(
  async () => ({
    default: (await import('./home_routes')).HomeRoutes,
  }),
  { fallback: <HomePageLoading /> }
);

export class ElasticsearchHomePlugin implements Plugin<
  void,
  ElasticsearchHomePublicStart,
  {},
  ElasticsearchHomeStartDependencies
> {
  public setup() {}

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

    const HomeApp = (props: ElasticsearchHomeAppProps) => {
      const { setBreadcrumbs } = props;
      return (
        <QueryClientProvider client={queryClient}>
          <I18nProvider>
            <ElasticsearchHomeProvider services={services} config={props}>
              <LazyHomeRoutes setBreadcrumbs={setBreadcrumbs} />
            </ElasticsearchHomeProvider>
          </I18nProvider>
        </QueryClientProvider>
      );
    };

    return {
      HomePage,
      HomeApp,
      getIntegratedOnboardingEnabled$: () => getIntegratedOnboardingEnabled$(core.featureFlags),
      useIntegratedOnboardingEnabled: () => useIntegratedOnboardingEnabled(core.featureFlags),
    };
  }

  public stop() {}
}
