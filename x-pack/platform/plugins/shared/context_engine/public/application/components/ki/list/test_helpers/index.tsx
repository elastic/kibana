/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { INDEX_MANAGEMENT_LOCATOR_ID } from '@kbn/index-management-shared-types';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { render, type RenderResult } from '@testing-library/react';
import { createMemoryHistory, type MemoryHistory } from 'history';
import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import type { GetAiIndexResponse } from '../../../../../../common/http_api/ai_indices';
import { uiPrivileges } from '../../../../../../common/features';

export const listKiTestAiIndex: GetAiIndexResponse = {
  id: 'sample-ki',
  managed: false,
  memory_enabled: false,
  dest: { type: 'index', value: 'ai-index-idx-sample-ki' },
  automations: [],
  sources: [{ type: 'connector', value: 'connector-1' }],
  traces: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

export const SAMPLE_INDEX_MANAGEMENT_URL =
  '/app/management/data/index_management/indices/index_details?indexName=ai-index-idx-sample-ki';
export const SAMPLE_DISCOVER_URL =
  '/app/discover#/?_a=(query:(esql:FROM%20ai-index-idx-sample-ki))';

export interface ListKiRenderOptions {
  discoverShow?: boolean;
  indexManagementMonitor?: boolean;
  initialPath?: string;
  canWrite?: boolean;
}

type ListKiTestServices = ReturnType<typeof coreMock.createStart> & {
  share: ReturnType<typeof sharePluginMock.createStartContract>;
};

export type ListKiRenderResult = RenderResult & {
  history: MemoryHistory;
  services: ListKiTestServices;
};

export const renderListKiWithProviders = (
  ui: React.ReactElement,
  options: ListKiRenderOptions = {}
): ListKiRenderResult => {
  const {
    discoverShow = true,
    indexManagementMonitor = true,
    initialPath = '/ai_index/sample-ki/knowledge_documents',
    canWrite = false,
  } = options;
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  const services: ListKiTestServices = {
    ...coreMock.createStart(),
    share: sharePluginMock.createStartContract(),
  };
  services.application.capabilities = {
    ...services.application.capabilities,
    contextEngine: { show: true, [uiPrivileges.write]: canWrite },
    discover_v2: { show: discoverShow },
    index_management: {
      ...services.application.capabilities.index_management,
      monitor: indexManagementMonitor,
    },
  };

  const indexManagementLocator = sharePluginMock.createLocator();
  indexManagementLocator.getUrl.mockResolvedValue(SAMPLE_INDEX_MANAGEMENT_URL);
  const discoverLocator = sharePluginMock.createLocator();
  discoverLocator.getRedirectUrl.mockReturnValue(SAMPLE_DISCOVER_URL);
  jest.spyOn(services.share.url.locators, 'get').mockImplementation((locatorId: string) => {
    if (locatorId === INDEX_MANAGEMENT_LOCATOR_ID) {
      return indexManagementLocator;
    }
    if (locatorId === DISCOVER_APP_LOCATOR) {
      return discoverLocator;
    }
    return undefined;
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const result = render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={{ ...services, history }}>
          <QueryClientProvider client={queryClient}>
            <Router history={history}>{ui}</Router>
          </QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

  return { ...result, history, services };
};
