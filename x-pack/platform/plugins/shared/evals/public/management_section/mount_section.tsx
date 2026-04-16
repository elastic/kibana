/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from '@kbn/i18n-react';
import type { CoreSetup } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { PLUGIN_NAME } from '../../common';
import { EvalsApp } from '../application';

interface MountSectionParams {
  core: CoreSetup;
  mountParams: ManagementAppMountParams;
}

const aiBreadcrumbLabel = i18n.translate('xpack.evals.stackManagement.breadcrumbs.ai', {
  defaultMessage: 'AI',
});

export const mountManagementSection = async ({
  core,
  mountParams: { element, setBreadcrumbs, history },
}: MountSectionParams) => {
  try {
    const [coreStart, startDeps] = await core.getStartServices();
    coreStart.chrome.docTitle.change(PLUGIN_NAME);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
        },
      },
    });

    const breadcrumbPrefix = [{ text: aiBreadcrumbLabel }, { text: PLUGIN_NAME }];
    const getHref = (path: string) => path;

    const rootStyle = {
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: 0,
    } as React.CSSProperties;

    const App = () => (
      <div style={rootStyle}>
        <QueryClientProvider client={queryClient}>
          <I18nProvider>
            <KibanaContextProvider services={{ ...coreStart, ...startDeps }}>
              <EvalsApp
                history={history}
                setBreadcrumbs={setBreadcrumbs}
                getHref={getHref}
                breadcrumbPrefix={breadcrumbPrefix}
              />
            </KibanaContextProvider>
          </I18nProvider>
        </QueryClientProvider>
      </div>
    );

    const root = createRoot(element);
    root.render(coreStart.rendering.addContext(<App />));

    return () => {
      coreStart.chrome.docTitle.reset();
      root.unmount();
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[evals] mountManagementSection failed:', err);
    throw err;
  }
};
