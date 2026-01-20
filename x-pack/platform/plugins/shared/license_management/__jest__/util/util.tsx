/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-env jest */

import React from 'react';
import { Provider } from 'react-redux';

import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import { coreMock, httpServiceMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { licenseManagementStore } from '../../public/application/store/store';
import { AppContextProvider, type AppDependencies } from '../../public/application/app_context';
import { BreadcrumbService } from '../../public/application/breadcrumbs';

const highExpirationMillis = new Date('October 13, 2099 00:00:00Z').getTime();

type History = ReturnType<typeof scopedHistoryMock.create>;

interface Toasts {
  addDanger: jest.MockedFunction<(message: string) => void>;
}

interface ThunkServices {
  http: ReturnType<typeof httpServiceMock.createSetupContract>;
  history: History;
  licensing: ReturnType<typeof licensingMock.createSetup>;
  toasts: Toasts;
}

export interface GetComponentResult {
  renderResult: RenderResult;
  history: History;
  services: ThunkServices;
  store: ReturnType<typeof licenseManagementStore>;
}

const createHistory = (): History => {
  const history = scopedHistoryMock.create();
  history.createHref.mockImplementation((location) => {
    return `${location.pathname}${location.search ? '?' + location.search : ''}`;
  });
  return history;
};

export const createMockLicense = (
  type: string,
  expiryDateInMillis: number = highExpirationMillis
) => {
  return {
    type,
    expiryDateInMillis,
    isActive: new Date().getTime() < expiryDateInMillis,
  };
};

export const getComponent = (
  initialState: Record<string, unknown>,
  Component: React.ComponentType<{}>
): GetComponentResult => {
  const history = createHistory();
  const core = coreMock.createStart();
  const breadcrumbService = new BreadcrumbService();
  breadcrumbService.setup(jest.fn());

  const licensing = licensingMock.createSetup();

  const services: ThunkServices = {
    http: httpServiceMock.createSetupContract(),
    history,
    licensing,
    toasts: {
      addDanger: jest.fn(),
    },
  };

  // StartTrial dispatches loadTrialStatus on mount, which calls http.get(). Make this deterministic
  // for tests that use initialState.trialStatus.
  const canStartTrial = Boolean(
    (initialState.trialStatus as { canStartTrial?: unknown } | undefined)?.canStartTrial
  );
  services.http.get.mockResolvedValue(canStartTrial);

  const store = licenseManagementStore(initialState, services);

  const appDependencies: AppDependencies = {
    core,
    services: {
      breadcrumbService,
      history,
    },
    plugins: {
      licensing,
    },
    docLinks: {
      security: 'https://docs.elastic.co',
    },
    store: {
      initialLicense: licensingMock.createLicense(),
    },
    config: {
      ui: { enabled: true },
    },
  };

  const renderResult = render(
    <I18nProvider>
      <AppContextProvider value={appDependencies}>
        <Provider store={store}>
          <Component />
        </Provider>
      </AppContextProvider>
    </I18nProvider>
  );

  return { renderResult, history, services, store };
};
