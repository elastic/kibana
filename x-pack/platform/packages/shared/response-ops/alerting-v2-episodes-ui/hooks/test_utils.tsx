/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import type { QueryClientConfig } from '@kbn/react-query';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

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
