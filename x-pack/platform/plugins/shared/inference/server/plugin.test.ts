/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { coreMock } from '@kbn/core/server/mocks';
import type { InferenceSetupDependencies } from './types';
import { InferencePlugin, resolveOnFailureMode, resolveReplacementsEncryptionKey } from './plugin';

describe('resolveReplacementsEncryptionKey', () => {
  it('returns undefined when anonymization is disabled', async () => {
    await expect(
      resolveReplacementsEncryptionKey({
        namespace: 'default',
        anonymizationEnabled: false,
      })
    ).resolves.toBeUndefined();
  });

  it('returns policy-managed key when anonymization is enabled', async () => {
    const getReplacementsEncryptionKey = jest.fn().mockResolvedValue('managed-key');

    await expect(
      resolveReplacementsEncryptionKey({
        namespace: 'default',
        anonymizationEnabled: true,
        policyService: { getReplacementsEncryptionKey },
      })
    ).resolves.toBe('managed-key');
  });

  it('returns undefined when policy service is unavailable', async () => {
    await expect(
      resolveReplacementsEncryptionKey({
        namespace: 'default',
        anonymizationEnabled: true,
      })
    ).resolves.toBeUndefined();
  });
});

describe('resolveOnFailureMode', () => {
  it('returns the mode saved in the ai:anonymizationSettings setting', async () => {
    await expect(
      resolveOnFailureMode({
        anonymizationEnabled: false,
        legacySettingsPromise: Promise.resolve({ rules: [], onFailure: 'allow_unsafe' }),
      })
    ).resolves.toBe('allow_unsafe');
  });

  it('blocks when the setting does not say otherwise', async () => {
    await expect(
      resolveOnFailureMode({
        anonymizationEnabled: false,
        legacySettingsPromise: Promise.resolve({ rules: [] }),
      })
    ).resolves.toBe('block');
  });

  it('blocks on the profile-based path, which has no failure-mode concept', async () => {
    await expect(
      resolveOnFailureMode({
        anonymizationEnabled: true,
        legacySettingsPromise: Promise.resolve({ rules: [], onFailure: 'allow_unsafe' }),
      })
    ).resolves.toBe('block');
  });

  it('blocks instead of rejecting when the setting cannot be read, so an unawaited promise is never an unhandled rejection', async () => {
    await expect(
      resolveOnFailureMode({
        anonymizationEnabled: false,
        legacySettingsPromise: Promise.reject(new Error('saved objects unavailable')),
      })
    ).resolves.toBe('block');
  });
});

describe('InferencePlugin.setup', () => {
  const setupPlugin = (
    workersEnabled: boolean,
    plugins: Partial<InferenceSetupDependencies> = {}
  ) => {
    const plugin = new InferencePlugin(
      coreMock.createPluginInitializerContext({
        enabled: true,
        workers: {
          anonymization: {
            enabled: workersEnabled,
            minThreads: 0,
            maxThreads: 3,
            maxQueue: 20,
            idleTimeout: moment.duration(30, 'seconds'),
            taskTimeout: moment.duration(15, 'seconds'),
          },
        },
      })
    );
    return plugin.setup(coreMock.createSetup(), {
      actions: {},
      ...plugins,
    } as unknown as InferenceSetupDependencies);
  };

  for (const workersEnabled of [true, false]) {
    it(`tells the anonymization settings plugin whether anonymization workers are enabled (${workersEnabled})`, () => {
      const configurePatternTester = jest.fn();

      setupPlugin(workersEnabled, { aiAnonymizationSettings: { configurePatternTester } });

      expect(configurePatternTester).toHaveBeenCalledTimes(1);
      expect(configurePatternTester).toHaveBeenCalledWith({ enabled: workersEnabled });
    });
  }

  it('does not require the anonymization settings plugin', () => {
    expect(() => setupPlugin(true)).not.toThrow();
  });
});
