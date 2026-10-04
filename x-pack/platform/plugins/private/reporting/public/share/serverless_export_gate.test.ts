/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';

import { REPORTING_SERVERLESS_EXPORT_ENABLED } from '../../common/feature_flags';
import { createServerlessExportGate, withAvailabilityGate } from './serverless_export_gate';

const featureFlagsWith = (value: boolean) => {
  const { featureFlags } = coreMock.createStart();
  featureFlags.getBooleanValue.mockReturnValue(value);
  return featureFlags;
};

const prerequisiteCheckArgs = {
  capabilities: coreMock.createStart().application.capabilities,
  objectType: 'dashboard',
};

describe('createServerlessExportGate', () => {
  it('is available on traditional without consulting the feature flag', () => {
    const featureFlags = featureFlagsWith(false);

    const isAvailable = createServerlessExportGate({
      isServerless: false,
      getFeatureFlags: () => featureFlags,
    });

    expect(isAvailable()).toBe(true);
    expect(featureFlags.getBooleanValue).not.toHaveBeenCalled();
  });

  it('is available on serverless when the feature flag is on', () => {
    const featureFlags = featureFlagsWith(true);

    const isAvailable = createServerlessExportGate({
      isServerless: true,
      getFeatureFlags: () => featureFlags,
    });

    expect(isAvailable()).toBe(true);
    expect(featureFlags.getBooleanValue).toHaveBeenCalledWith(
      REPORTING_SERVERLESS_EXPORT_ENABLED,
      false
    );
  });

  it('is unavailable on serverless when the feature flag is off', () => {
    const isAvailable = createServerlessExportGate({
      isServerless: true,
      getFeatureFlags: () => featureFlagsWith(false),
    });

    expect(isAvailable()).toBe(false);
  });

  it('is unavailable on serverless before the start lifecycle has run', () => {
    const isAvailable = createServerlessExportGate({
      isServerless: true,
      getFeatureFlags: () => undefined,
    });

    expect(isAvailable()).toBe(false);
  });

  it('follows the flag as it changes, rather than caching the first evaluation', () => {
    const featureFlags = featureFlagsWith(false);

    const isAvailable = createServerlessExportGate({
      isServerless: true,
      getFeatureFlags: () => featureFlags,
    });

    expect(isAvailable()).toBe(false);

    featureFlags.getBooleanValue.mockReturnValue(true);

    expect(isAvailable()).toBe(true);
  });
});

describe('withAvailabilityGate', () => {
  it('hides the integration when it is unavailable, without running its own check', () => {
    const prerequisiteCheck = jest.fn().mockReturnValue(true);

    const gated = withAvailabilityGate({ id: 'pdfReports', prerequisiteCheck }, () => false);

    expect(gated.prerequisiteCheck?.(prerequisiteCheckArgs)).toBe(false);
    expect(prerequisiteCheck).not.toHaveBeenCalled();
  });

  it('defers to the integration when it is available', () => {
    const prerequisiteCheck = jest.fn().mockReturnValue(false);

    const gated = withAvailabilityGate({ id: 'pdfReports', prerequisiteCheck }, () => true);

    expect(gated.prerequisiteCheck?.(prerequisiteCheckArgs)).toBe(false);
    expect(prerequisiteCheck).toHaveBeenCalledWith(prerequisiteCheckArgs);
  });

  it('treats an integration with no check of its own as available', () => {
    const gated = withAvailabilityGate({ id: 'pdfReports' }, () => true);

    expect(gated.prerequisiteCheck?.(prerequisiteCheckArgs)).toBe(true);
  });

  it('leaves the rest of the integration untouched', () => {
    const integration = { id: 'pdfReports', groupId: 'export' };

    const gated = withAvailabilityGate(integration, () => true);

    expect(gated).toMatchObject({ id: 'pdfReports', groupId: 'export' });
    expect(integration).not.toHaveProperty('prerequisiteCheck');
  });
});
