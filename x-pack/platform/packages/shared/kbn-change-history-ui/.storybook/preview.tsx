/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClientProvider } from '@kbn/react-query';
import { createTestQueryClient } from '../src/test_utils/create_query_client_wrapper';

const queryClient = createTestQueryClient();

export const decorators = [
  (Story: React.ComponentType) => (
    <EuiProvider colorMode="light">
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      </I18nProvider>
    </EuiProvider>
  ),
];
