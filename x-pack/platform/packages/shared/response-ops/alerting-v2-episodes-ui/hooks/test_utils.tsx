/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import type { QueryClientConfig } from '@kbn/react-query';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { of } from 'rxjs';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { type Space } from '@kbn/spaces-plugin/common';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { UnifiedDocViewerStart } from '@kbn/unified-doc-viewer-plugin/public';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import type { AlertEpisodeDetailsServices } from '../components/details/types';

export const createMockSpaces = (): jest.Mocked<SpacesPluginStart> => {
  const spaces = spacesPluginMock.createStartContract();
  const activeSpace: Space = { id: DEFAULT_SPACE_ID, name: DEFAULT_SPACE_ID, disabledFeatures: [] };
  spaces.getActiveSpace.mockResolvedValue(activeSpace);
  spaces.getActiveSpace$.mockReturnValue(of(activeSpace));
  return spaces;
};

export const createMockUiSettings = (): IUiSettingsClient =>
  ({
    get: jest.fn(() => 'YYYY-MM-DD HH:mm:ss'),
  } as unknown as IUiSettingsClient);

export const createMockUnifiedDocViewer = (): UnifiedDocViewerStart =>
  ({
    registry: {
      getAll: () => [
        { id: 'doc_view_table', render: () => <div data-test-subj="mock-doc-viewer-table" /> },
      ],
    },
  } as unknown as UnifiedDocViewerStart);

export const createMockServices = (
  overrides: Partial<AlertEpisodeDetailsServices> = {}
): AlertEpisodeDetailsServices => ({
  data: dataPluginMock.createStartContract(),
  dataViews: dataViewPluginMocks.createStartContract(),
  expressions: expressionsPluginMock.createStartContract(),
  http: httpServiceMock.createStartContract(),
  spaces: createMockSpaces(),
  uiSettings: createMockUiSettings(),
  unifiedDocViewer: createMockUnifiedDocViewer(),
  userProfile: userProfileServiceMock.createStart(),
  ...overrides,
});

export const createTestQueryClient = (config: QueryClientConfig = {}) => {
  const { defaultOptions, ...rest } = config;
  return new QueryClient({
    ...rest,
    defaultOptions: {
      ...defaultOptions,
      queries: { retry: false, ...defaultOptions?.queries },
    },
  });
};

export const createQueryClientWrapper = (client: QueryClient) => {
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

export const createMockRule = (overrides: Partial<RuleResponse> = {}): RuleResponse =>
  ({
    id: 'rule-1',
    enabled: true,
    kind: 'alerting',
    metadata: { name: 'Rule 1' },
    query: { format: 'standalone', breach: { query: 'FROM logs' } },
    ...overrides,
  } as RuleResponse);
