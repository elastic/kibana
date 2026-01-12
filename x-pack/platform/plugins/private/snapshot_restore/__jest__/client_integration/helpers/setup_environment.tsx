/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './mocks';

import React from 'react';
import { i18n } from '@kbn/i18n';
import { merge } from 'lodash';
import type { LocationDescriptorObject } from 'history';
import { I18nProvider } from '@kbn/i18n-react';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { HttpSetup } from '@kbn/core/public';
import { coreMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { setUiMetricService, httpService } from '../../../public/application/services/http';
import {
  breadcrumbService,
  docTitleService,
} from '../../../public/application/services/navigation';
import type { Authorization, Privileges } from '../../../public/shared_imports';
import { AuthorizationContext, GlobalFlyout } from '../../../public/shared_imports';
import { AppContextProvider } from '../../../public/application/app_context';
import type { AppDependencies } from '../../../public/application/app_context';
import { textService } from '../../../public/application/services/text';
import { init as initHttpRequests } from './http_requests';
import { UiMetricService } from '../../../public/application/services';

const { GlobalFlyoutProvider } = GlobalFlyout;
const history = scopedHistoryMock.create();
history.createHref.mockImplementation((location: LocationDescriptorObject) => {
  return `${location.pathname}?${location.search}`;
});

interface WorkerStub {
  postMessage: (...args: unknown[]) => void;
  terminate: () => void;
}

type WorkerConstructor = new (...args: unknown[]) => WorkerStub;

const createAuthorizationContextValue = (privileges: Privileges) => {
  return {
    isLoading: false,
    privileges: privileges ?? { hasAllPrivileges: false, missingPrivileges: {} },
  } as Authorization;
};

const core = coreMock.createStart();

export const services = {
  uiMetricService: new UiMetricService('snapshot_restore'),
  httpService,
  i18n,
  history,
  uiSettings: core.uiSettings,
  settings: core.settings,
};

setUiMetricService(services.uiMetricService);

const baseAppContextDependencies: AppDependencies = {
  core,
  services,
  config: {
    slm_ui: { enabled: true },
    ui: { enabled: true },
  },
};

const kibanaContextDependencies = {
  uiSettings: core.uiSettings,
  settings: core.settings,
  theme: core.theme,
};

export const setupEnvironment = () => {
  breadcrumbService.setup(() => undefined);
  textService.setup(i18n);
  docTitleService.setup(() => undefined);

  return initHttpRequests();
};

/**
 * Suppress error messages about Worker not being available in JS DOM.
 */
const WorkerMock = function Worker(this: WorkerStub) {
  this.postMessage = () => undefined;
  this.terminate = () => undefined;
} as unknown as WorkerConstructor;

(window as unknown as { Worker: WorkerConstructor }).Worker = WorkerMock;

export const WithAppDependencies =
  <P extends object>(
    Comp: React.ComponentType<P>,
    httpSetup?: HttpSetup,
    { privileges, ...overrides }: Record<string, unknown> = {}
  ) =>
  (props: P) => {
    // We need to optionally setup the httpService since some tests use jest mocks
    // to stub the fetch hooks instead of mocking API responses.
    if (httpSetup) {
      httpService.setup(httpSetup);
    }

    const appContextValue = merge(
      {},
      baseAppContextDependencies,
      overrides
    ) as unknown as AppDependencies;

    return (
      <I18nProvider>
        <AuthorizationContext.Provider
          value={createAuthorizationContextValue(privileges as Privileges)}
        >
          <KibanaContextProvider services={kibanaContextDependencies}>
            <AppContextProvider value={appContextValue}>
              <GlobalFlyoutProvider>
                <Comp {...props} />
              </GlobalFlyoutProvider>
            </AppContextProvider>
          </KibanaContextProvider>
        </AuthorizationContext.Provider>
      </I18nProvider>
    );
  };
