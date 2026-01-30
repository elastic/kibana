/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { Subject } from 'rxjs';
import { EuiProvider } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';

const uiSettings = {
  get: (setting: string) => {
    switch (setting) {
      case 'dateFormat':
        return 'MMM D, YYYY @ HH:mm:ss.SSS';
      case 'dateFormat:scaled':
        return [['', 'HH:mm:ss.SSS']];
    }
  },
  get$: () => new Subject(),
};

const coreMock = {
  uiSettings,
} as unknown as CoreStart;
const KibanaReactContext = createKibanaReactContext(coreMock);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export const StorybookProviders: FC<PropsWithChildren<unknown>> = ({ children }) => {
  return (
    <KibanaReactContext.Provider>
      <QueryClientProvider client={queryClient}>
        <EuiProvider colorMode="light">{children}</EuiProvider>
      </QueryClientProvider>
    </KibanaReactContext.Provider>
  );
};
