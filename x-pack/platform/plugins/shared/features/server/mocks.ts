/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazyObject } from '@kbn/lazy-object';
import type { FeaturesPluginSetup, FeaturesPluginStart } from './plugin';
import {
  featurePrivilegeIterator,
  subFeaturePrivilegeIterator,
} from './feature_privilege_iterator';

const createSetup = (): jest.Mocked<FeaturesPluginSetup> => {
  return lazyObject({
    getKibanaFeatures: jest.fn(),
    getElasticsearchFeatures: jest.fn(),
    registerKibanaFeature: jest.fn(),
    registerElasticsearchFeature: jest.fn(),
    enableReportingUiCapabilities: jest.fn(),
    featurePrivilegeIterator: jest.fn().mockImplementation(featurePrivilegeIterator),
    subFeaturePrivilegeIterator: jest.fn().mockImplementation(subFeaturePrivilegeIterator),
  });
};

const createStart = (): jest.Mocked<FeaturesPluginStart> => {
  return lazyObject({
    getKibanaFeatures: jest.fn().mockReturnValue([]),
    getElasticsearchFeatures: jest.fn().mockReturnValue([]),
  });
};

export const featuresPluginMock = {
  createSetup,
  createStart,
};
