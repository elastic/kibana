/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { lazyObject } from '@kbn/lazy-object';
import type {
  LicensingPluginSetup,
  LicensingPluginStart,
  LicensingApiRequestHandlerContext,
} from './types';
import { licenseMock } from '../common/licensing.mock';
import { featureUsageMock } from './services/feature_usage_service.mock';

const createSetupMock = (): jest.Mocked<LicensingPluginSetup> => {
  const license = licenseMock.createLicense();
  const mock = lazyObject({
    license$: new BehaviorSubject(license),
    refresh: jest.fn().mockResolvedValue(license),
    featureUsage: featureUsageMock.createSetup(),
  });

  return mock;
};

const createStartMock = (): jest.Mocked<LicensingPluginStart> => {
  const license = licenseMock.createLicense();

  const license$ = new BehaviorSubject(license);

  const refresh = jest.fn().mockResolvedValue(license);

  const mock = lazyObject({
    license$,
    getLicense: jest.fn(),
    refresh,
    createLicensePoller: jest.fn().mockReturnValue({
      license$,
      refresh,
    }),
    featureUsage: featureUsageMock.createStart(),
  });

  return mock;
};

const createRequestHandlerContextMock = (
  ...options: Parameters<typeof licenseMock.createLicense>
): jest.Mocked<LicensingApiRequestHandlerContext> => {
  const mock: jest.Mocked<LicensingApiRequestHandlerContext> = lazyObject({
    license: licenseMock.createLicense(...options),
    featureUsage: featureUsageMock.createStart(),
  });

  return mock;
};

export const licensingMock = {
  createSetup: createSetupMock,
  createStart: createStartMock,
  createRequestHandlerContext: createRequestHandlerContextMock,
  ...licenseMock,
};
