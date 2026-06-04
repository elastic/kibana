/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityError } from '../../lib/streams/errors/security_error';
import { FeatureNotEnabledError } from '../../lib/streams/errors/feature_not_enabled_error';
import { assertSignificantEventsAccess } from './assert_significant_events_access';

interface ContextOverrides {
  tierAvailable?: boolean;
  hasEnterpriseLicense?: boolean;
  uiSettingEnabled?: boolean;
  workflowsPlugin?: boolean;
  inferencePlugin?: boolean;
  agentBuilderPlugin?: boolean;
}

const buildArgs = (overrides: ContextOverrides = {}) => {
  const {
    tierAvailable = true,
    hasEnterpriseLicense = true,
    uiSettingEnabled = true,
    workflowsPlugin = true,
    inferencePlugin = true,
    agentBuilderPlugin = true,
  } = overrides;

  const server = {
    core: {
      pricing: { isFeatureAvailable: jest.fn().mockReturnValue(tierAvailable) },
    },
    workflowsExtensions: workflowsPlugin ? {} : undefined,
    searchInferenceEndpoints: inferencePlugin ? {} : undefined,
    agentBuilder: agentBuilderPlugin ? {} : undefined,
  };

  const licensing = {
    getLicense: jest
      .fn()
      .mockResolvedValue({ hasAtLeast: jest.fn().mockReturnValue(hasEnterpriseLicense) }),
  };

  const uiSettingsClient = { get: jest.fn().mockResolvedValue(uiSettingEnabled) };

  return {
    server,
    licensing,
    uiSettingsClient,
  } as unknown as Parameters<typeof assertSignificantEventsAccess>[0];
};

describe('assertSignificantEventsAccess', () => {
  it('resolves when all requirements are met', async () => {
    await expect(assertSignificantEventsAccess(buildArgs())).resolves.toBeUndefined();
  });

  it('throws a SecurityError (403) when the pricing tier is unavailable', async () => {
    await expect(
      assertSignificantEventsAccess(buildArgs({ tierAvailable: false }))
    ).rejects.toBeInstanceOf(SecurityError);
  });

  it('throws a boom forbidden error when the license is insufficient', async () => {
    await expect(
      assertSignificantEventsAccess(buildArgs({ hasEnterpriseLicense: false }))
    ).rejects.toEqual(expect.objectContaining({ isBoom: true }));
  });

  it('throws a FeatureNotEnabledError when the UI setting is disabled', async () => {
    await expect(
      assertSignificantEventsAccess(buildArgs({ uiSettingEnabled: false }))
    ).rejects.toBeInstanceOf(FeatureNotEnabledError);
  });

  it('throws a FeatureNotEnabledError when workflows is unavailable', async () => {
    await expect(
      assertSignificantEventsAccess(buildArgs({ workflowsPlugin: false }))
    ).rejects.toBeInstanceOf(FeatureNotEnabledError);
  });

  it('throws a FeatureNotEnabledError when inference endpoints are unavailable', async () => {
    await expect(
      assertSignificantEventsAccess(buildArgs({ inferencePlugin: false }))
    ).rejects.toBeInstanceOf(FeatureNotEnabledError);
  });

  it('throws a FeatureNotEnabledError when agent builder is unavailable', async () => {
    await expect(
      assertSignificantEventsAccess(buildArgs({ agentBuilderPlugin: false }))
    ).rejects.toBeInstanceOf(FeatureNotEnabledError);
  });

  it('throws the first unmet requirement in registry order (tier before license)', async () => {
    await expect(
      assertSignificantEventsAccess(
        buildArgs({ tierAvailable: false, hasEnterpriseLicense: false })
      )
    ).rejects.toBeInstanceOf(SecurityError);
  });
});
