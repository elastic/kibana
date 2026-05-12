/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Context, CoreStart } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { Decorator } from '@storybook/react';
import { Container } from 'inversify';
import { action } from '@storybook/addon-actions';
import React, { useMemo } from 'react';
import { ActionPoliciesApi } from '../public/services/action_policies_api';
import { RulesApi } from '../public/services/rules_api';

const buildContainer = () => {
  const container = new Container({ defaultScope: 'Singleton' });

  container.bind(CoreStart('application')).toConstantValue({
    getUrlForApp: (appId: string, opts?: { path?: string }) => `/app/${appId}${opts?.path ?? ''}`,
    navigateToUrl: action('application.navigateToUrl'),
    navigateToApp: action('application.navigateToApp'),
    currentAppId$: { subscribe: () => ({ unsubscribe: () => {} }) },
    capabilities: {},
  });

  container.bind(CoreStart('uiSettings')).toConstantValue({
    get: () => true,
    get$: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
  });

  container.bind(CoreStart('notifications')).toConstantValue({
    toasts: {
      addError: action('notifications.toasts.addError'),
      addSuccess: action('notifications.toasts.addSuccess'),
      addWarning: action('notifications.toasts.addWarning'),
      addDanger: action('notifications.toasts.addDanger'),
    },
  });

  container.bind(CoreStart('http')).toConstantValue({
    get: async () => [],
    post: async () => ({}),
    patch: async () => ({}),
    delete: async () => ({}),
    basePath: { prepend: (p: string) => p, get: () => '' },
  });

  container.bind(ActionPoliciesApi).toSelf();
  container.bind(RulesApi).toSelf();

  container.bind(PluginStart('kql')).toConstantValue({
    QueryStringInput: ({
      query,
      onChange,
      placeholder,
      dataTestSubj,
    }: {
      query: { query: string; language: string };
      onChange: (q: { query: string; language: string }) => void;
      placeholder?: string;
      dataTestSubj?: string;
      [key: string]: unknown;
    }) => (
      <input
        type="text"
        placeholder={placeholder}
        data-test-subj={dataTestSubj}
        value={query.query}
        onChange={(e) => onChange({ query: e.target.value, language: 'kuery' })}
      />
    ),
  });

  return container;
};

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const DiDecorator: Decorator = (storyFn) => {
  const container = useMemo(buildContainer, []);
  return (
    <QueryClientProvider client={queryClient}>
      <Context.Provider value={container}>{storyFn()}</Context.Provider>
    </QueryClientProvider>
  );
};

export const decorators = [DiDecorator];
