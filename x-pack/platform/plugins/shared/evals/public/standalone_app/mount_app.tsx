/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from '@kbn/i18n-react';
import type { AppMountParameters, ChromeBreadcrumb, CoreStart } from '@kbn/core/public';
import { KibanaContextProvider, reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { EvalsStartDependencies } from '../types';
import { EvalsApp } from '../application';
import { APP_TITLE } from '../translations';

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
  coreStart.chrome.docTitle.change(APP_TITLE);

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
    const rootBreadcrumb = wrapBreadcrumb({ text: APP_TITLE, href: getHref('/') });

    coreStart.chrome.setBreadcrumbs([rootBreadcrumb, ...trailingBreadcrumbs], {
      project: { value: trailingBreadcrumbs },
    });
  };

  const App = () => (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <KibanaContextProvider services={{ ...coreStart, ...startDeps }}>
          <RedirectAppLinks coreStart={coreStart}>
            <KibanaPageTemplate panelled restrictWidth={false}>
              <KibanaPageTemplate.Section>
                <EvalsApp history={history} setBreadcrumbs={setBreadcrumbs} getHref={getHref} />
              </KibanaPageTemplate.Section>
            </KibanaPageTemplate>
          </RedirectAppLinks>
        </KibanaContextProvider>
      </I18nProvider>
    </QueryClientProvider>
  );

  const root = createRoot(element);
  root.render(coreStart.rendering.addContext(<App />));

  return () => {
    root.unmount();
  };
};
