/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentType } from 'react';
import type { LocationDescriptorObject } from 'history';
import type { HttpSetup } from '@kbn/core/public';

import type { ApplicationStart } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import { MockUrlService } from '@kbn/share-plugin/common/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import {
  notificationServiceMock,
  docLinksServiceMock,
  scopedHistoryMock,
  uiSettingsServiceMock,
  applicationServiceMock,
  overlayServiceMock,
} from '@kbn/core/public/mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';

import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/public/mocks';

import {
  breadcrumbService,
  documentationService,
  uiMetricService,
  apiService,
} from '../../../public/application/services';

import { init as initHttpRequests } from './http_requests';

const history = scopedHistoryMock.create();
history.createHref.mockImplementation((location: LocationDescriptorObject) => {
  return `${location.pathname}?${location.search}`;
});

const applicationMock = {
  ...applicationServiceMock.createStartContract(),
  capabilities: {
    dev_tools: {
      show: true,
    },
  },
} as unknown as ApplicationStart;

const appServices = {
  breadcrumbs: breadcrumbService,
  metric: uiMetricService,
  documentation: documentationService,
  api: apiService,
  fileReader: {
    readFile: jest.fn((file: File) => file.text()),
  },
  notifications: notificationServiceMock.createSetupContract(),
  history,
  uiSettings: uiSettingsServiceMock.createSetupContract(),
  url: sharePluginMock.createStartContract().url,
  fileUpload: {
    getMaxBytes: jest.fn().mockReturnValue(100),
    getMaxBytesFormatted: jest.fn().mockReturnValue('100'),
  },
  application: applicationMock,
  share: {
    url: new MockUrlService(),
  },
  overlays: overlayServiceMock.createStartContract(),
  http: httpServiceMock.createStartContract({ basePath: '/mock' }),
  config: {
    enableManageProcessors: true,
  },
};

export const setupEnvironment = () => {
  documentationService.setup(docLinksServiceMock.createStartContract());
  breadcrumbService.setup(() => {});

  return initHttpRequests();
};

export const WithAppDependencies =
  <P,>(Comp: ComponentType<P>, httpSetup: HttpSetup) =>
  (props: P) => {
    uiMetricService.setup(usageCollectionPluginMock.createSetupContract());
    apiService.setup(httpSetup, uiMetricService);

    return (
      <I18nProvider>
        <KibanaContextProvider services={appServices}>
          <Comp {...(props as React.JSX.IntrinsicAttributes & P)} />
        </KibanaContextProvider>
      </I18nProvider>
    );
  };
