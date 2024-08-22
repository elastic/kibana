/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaFeature } from '@kbn/features-plugin/public';
import { type FeaturesPluginSetup } from '@kbn/features-plugin/server';
import {
  featurePrivilegeIterator,
  subFeaturePrivilegeIterator,
} from '@kbn/features-plugin/server/feature_privilege_iterator';
import type { LicenseType } from '@kbn/licensing-plugin/server';
import type { SecurityLicenseFeatures } from '@kbn/security-plugin-types-common';
import { Actions, privilegesFactory } from '@kbn/security-authorization-core';
import { KibanaPrivileges } from '../kibana_privileges';

const featuresPluginService = (): jest.Mocked<FeaturesPluginSetup> => {
  return {
    getKibanaFeatures: jest.fn(),
    getElasticsearchFeatures: jest.fn(),
    registerKibanaFeature: jest.fn(),
    registerElasticsearchFeature: jest.fn(),
    enableReportingUiCapabilities: jest.fn(),
    featurePrivilegeIterator: jest.fn().mockImplementation(featurePrivilegeIterator),
    subFeaturePrivilegeIterator: jest.fn().mockImplementation(subFeaturePrivilegeIterator),
  };
};

export const createRawKibanaPrivileges = (
  features: KibanaFeature[],
  { allowSubFeaturePrivileges = true } = {}
) => {
  const featuresService = featuresPluginService();
  featuresService.getKibanaFeatures.mockReturnValue(features);

  const licensingService = {
    getFeatures: () => ({ allowSubFeaturePrivileges } as SecurityLicenseFeatures),
    getType: () => 'basic' as const,
    hasAtLeast: (licenseType: LicenseType) => licenseType === 'basic',
  };

  return privilegesFactory(new Actions(), featuresService, licensingService).get();
};

export const createKibanaPrivileges = (
  features: KibanaFeature[],
  { allowSubFeaturePrivileges = true } = {}
) => {
  return new KibanaPrivileges(
    createRawKibanaPrivileges(features, { allowSubFeaturePrivileges }),
    features
  );
};
