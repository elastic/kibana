/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Context, CoreStart } from '@kbn/core-di-browser';
import type { Decorator } from '@storybook/react';
import { Container } from 'inversify';
import { action } from '@storybook/addon-actions';
import React, { useMemo } from 'react';

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
    basePath: { prepend: (p: string) => p, get: () => '' },
  });

  return container;
};

const DiDecorator: Decorator = (storyFn) => {
  const container = useMemo(buildContainer, []);
  return <Context.Provider value={container}>{storyFn()}</Context.Provider>;
};

export const decorators = [DiDecorator];
