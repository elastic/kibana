/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';

import { LIGHT_THEME } from '@elastic/charts';

import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import type { MlCapabilities } from '@kbn/ml-common-types/capabilities';
import { getDefaultMlCapabilities } from '@kbn/ml-common-types/capabilities';
import { mlApiServicesMock } from '@kbn/ml-services/__mocks__/ml_api_services';

export const chartsServiceMock = {
  theme: {
    useChartsBaseTheme: jest.fn(() => LIGHT_THEME),
  },
  activeCursor: {
    activeCursor$: new BehaviorSubject({
      cursor: {
        x: 10432423,
      },
    }),
  },
};

const defaultCapabilities = Object.keys(getDefaultMlCapabilities()).reduce((acc, key) => {
  acc[key] = true;
  return acc;
}, {} as Record<string, boolean>);

export const kibanaContextMock = {
  services: {
    docLinks: { links: { ml: { guide: '' } } },
    uiSettings: { get: jest.fn() },
    chrome: { recentlyAccessed: { add: jest.fn() }, setHelpExtension: jest.fn() },
    application: {
      navigateToApp: jest.fn(),
      navigateToUrl: jest.fn(),
      capabilities: {
        ml: {
          canCreateJob: true,
        },
      },
    },
    http: {
      basePath: {
        get: jest.fn(),
      },
    },
    share: {
      url: {
        locators: {
          get: jest.fn(() => {
            return {
              getUrl: jest.fn(() => {
                return Promise.resolve('mock-url');
              }),
            };
          }),
        },
      },
      urlGenerators: { getUrlGenerator: jest.fn() },
    },
    data: dataPluginMock.createStartContract(),
    charts: chartsServiceMock,
    fieldFormats: fieldFormatsServiceMock.createStartContract(),
    mlServices: {
      mlApi: mlApiServicesMock,
      mlCapabilities: {
        capabilities$: new BehaviorSubject(defaultCapabilities),
        getCapabilities: jest.fn().mockResolvedValue(defaultCapabilities),
        refreshCapabilities: jest.fn(),
      },
      mlFieldFormatService: {
        getFieldFormat: jest.fn(),
      },
    },
    notifications: notificationServiceMock.createStartContract(),
  },
};

export const useMlKibana = jest.fn(() => {
  return kibanaContextMock;
});

export const getMockedContextWithCapabilities = (capabilities: Partial<MlCapabilities>) => {
  return {
    ...kibanaContextMock,
    services: {
      ...kibanaContextMock.services,
      mlServices: {
        ...kibanaContextMock.services.mlServices,
        mlCapabilities: {
          ...kibanaContextMock.services.mlServices.mlCapabilities,
          getCapabilities: jest.fn().mockResolvedValue(capabilities),
          capabilities$: new BehaviorSubject(capabilities),
        },
      },
    },
  };
};
