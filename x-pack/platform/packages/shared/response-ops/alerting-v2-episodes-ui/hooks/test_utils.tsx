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
import { DEFAULT_SPACE_ID, type Space } from '@kbn/spaces-plugin/common';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';

export const createMockSpaces = (): jest.Mocked<SpacesPluginStart> => {
  const spaces = spacesPluginMock.createStartContract();
  const activeSpace = { id: DEFAULT_SPACE_ID } as Space;
  spaces.getActiveSpace.mockResolvedValue(activeSpace);
  spaces.getActiveSpace$.mockReturnValue(of(activeSpace));
  return spaces;
};

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
