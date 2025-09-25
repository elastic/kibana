/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { lazyObject } from '@kbn/lazy-object';
import type { LicensingPluginSetup, LicensingPluginStart } from './types';
import { licenseMock } from '../common/licensing.mock';
import { featureUsageMock } from './services/feature_usage_service.mock';

const createSetupMock = () => {
  const license = licenseMock.createLicense();
  const mock: jest.Mocked<LicensingPluginSetup> = lazyObject({
    license$: new BehaviorSubject(license),
    refresh: jest.fn().mockResolvedValue(license),
    featureUsage: featureUsageMock.createSetup(),
  });

  return mock;
};

const createStartMock = () => {
  const license = licenseMock.createLicense();
  const mock: jest.Mocked<LicensingPluginStart> = lazyObject({
    license$: new BehaviorSubject(license),
    getLicense: jest.fn(),
    refresh: jest.fn().mockResolvedValue(license),
    featureUsage: featureUsageMock.createStart(),
  });

  return mock;
};

export const licensingMock = {
  createSetup: createSetupMock,
  createStart: createStartMock,
  ...licenseMock,
};
