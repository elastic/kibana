/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { EuiPageTemplate } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { AppMountParameters, ChromeBreadcrumb, CoreStart } from '@kbn/core/public';
import { wrapWithTheme } from '@kbn/react-kibana-context-theme';
import { KibanaContextProvider, reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { PLUGIN_NAME } from '../../common';
import type { EvalsStartDependencies } from '../types';
import { EvalsApp } from '../application';

interface MountAppParams {
  coreStart: CoreStart;
  startDeps: EvalsStartDependencies;
  element: HTMLElement;
  history: AppMountParameters['history'];
}

export const mountStandaloneApp = async ({
  coreStart,
  startDeps,
  element,
  history,
}: MountAppParams) => {
  coreStart.chrome.docTitle.change(PLUGIN_NAME);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
      },
    },
  });

  const getHref = (path: string) => path;
  const wrapBreadcrumb = (breadcrumb: ChromeBreadcrumb): ChromeBreadcrumb => ({
    ...breadcrumb,
    ...(breadcrumb.href ? reactRouterNavigate(history, breadcrumb.href) : {}),
  });
  const setBreadcrumbs = (breadcrumbs: ChromeBreadcrumb[]) => {
    const trailingBreadcrumbs = breadcrumbs.map(wrapBreadcrumb);
    const rootBreadcrumb = wrapBreadcrumb({ text: PLUGIN_NAME, href: getHref('/') });

    coreStart.chrome.setBreadcrumbs([rootBreadcrumb, ...trailingBreadcrumbs], {
      project: { value: trailingBreadcrumbs },
    });
  };

  const App = () => (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <KibanaContextProvider services={{ ...coreStart, ...startDeps }}>
          <EuiPageTemplate offset={0}>
            <EuiPageTemplate.Section restrictWidth={false}>
              <EvalsApp history={history} setBreadcrumbs={setBreadcrumbs} getHref={getHref} />
            </EuiPageTemplate.Section>
          </EuiPageTemplate>
        </KibanaContextProvider>
      </I18nProvider>
    </QueryClientProvider>
  );

  ReactDOM.render(wrapWithTheme(<App />, coreStart.theme), element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
