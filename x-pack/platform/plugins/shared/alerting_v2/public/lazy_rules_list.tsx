/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import useAsync from 'react-use/lib/useAsync';
import { Context } from '@kbn/core-di-browser';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { I18nProvider } from '@kbn/i18n-react';
import { untilContainerReady } from './kibana_services';

export const LazyRulesList = () => {
  const queryClientRef = useRef(new QueryClient());

  const { loading, value } = useAsync(async () => {
    const [container, module] = await Promise.all([
      untilContainerReady(),
      import('./pages/rules_list_page/rules_list_content'),
    ]);
    return { container, RulesListContent: module.RulesListContent };
  }, []);

  if (loading || !value) return <EuiLoadingSpinner size="l" />;

  const { container, RulesListContent } = value;

  return (
    <Context.Provider value={container}>
      <QueryClientProvider client={queryClientRef.current}>
        <I18nProvider>
          <RulesListContent />
        </I18nProvider>
      </QueryClientProvider>
    </Context.Provider>
  );
};
