/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type MlCapabilitiesResponse } from '@kbn/ml-plugin/public';
import { createActor, toPromise } from 'xstate';
import {
  loadMlCapabilitiesActor,
  type MlApiDependency,
  type MlFeatureFlags,
} from './ml_capabilities';

describe('loadMlCapabilitiesActor', () => {
  const createMlApi = (overrides: Partial<MlCapabilitiesResponse> = {}): MlApiDependency => ({
    checkMlCapabilities: jest.fn().mockResolvedValue({
      isPlatinumOrTrialLicense: true,
      mlFeatureEnabledInSpace: true,
      ...overrides,
    }),
  });

  const featureFlags: MlFeatureFlags = { isPatternsEnabled: true };

  it('returns available when the license is sufficient and ml features are enabled', async () => {
    const mlApi = createMlApi();
    const actor = createActor(loadMlCapabilitiesActor({ mlApi }), { input: { featureFlags } });
    actor.start();
    const result = await toPromise(actor);
    expect(result).toEqual({ status: 'available' });
  });

  it('returns unavailable with reason insufficientLicense if not platinum or trial', async () => {
    const mlApi = createMlApi({ isPlatinumOrTrialLicense: false });
    const actor = createActor(loadMlCapabilitiesActor({ mlApi }), { input: { featureFlags } });
    actor.start();
    const result = await toPromise(actor);
    expect(result).toEqual({ status: 'unavailable', reason: 'insufficientLicense' });
  });

  it('returns unavailable with reason disabled if mlApi is missing', async () => {
    const actor = createActor(loadMlCapabilitiesActor({ mlApi: undefined }), {
      input: { featureFlags },
    });
    actor.start();
    const result = await toPromise(actor);
    expect(result).toEqual({ status: 'unavailable', reason: 'disabled' });
  });

  it('returns unavailable with reason disabled if patterns feature flag is not enabled', async () => {
    const mlApi = createMlApi();
    const actor = createActor(loadMlCapabilitiesActor({ mlApi }), {
      input: { featureFlags: { isPatternsEnabled: false } },
    });
    actor.start();
    const result = await toPromise(actor);
    expect(result).toEqual({ status: 'unavailable', reason: 'disabled' });
  });

  it('returns unavailable with reason disabled if mlFeatureEnabledInSpace is false', async () => {
    const mlApi = createMlApi({ mlFeatureEnabledInSpace: false });
    const actor = createActor(loadMlCapabilitiesActor({ mlApi }), { input: { featureFlags } });
    actor.start();
    const result = await toPromise(actor);
    expect(result).toEqual({ status: 'unavailable', reason: 'disabled' });
  });
});
