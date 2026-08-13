/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getOnboardingSessionKey,
  getOnboardingSessionKeys,
  clearOnboardingSession,
} from './onboarding_session_storage';

const ALL_SUFFIXES = [
  'deploySettingsStep',
  'servicesStep',
  'deployAndDetectStep',
  'serviceSettingsStep',
  'stepState',
] as const;

describe('getOnboardingSessionKey', () => {
  it('builds the expected key string', () => {
    expect(getOnboardingSessionKey('aws', 'servicesStep')).toBe('onboarding.aws.servicesStep');
  });
});

describe('getOnboardingSessionKeys', () => {
  it('returns all five keys for the given integration', () => {
    const keys = getOnboardingSessionKeys('aws');
    expect(keys).toHaveLength(5);
    for (const suffix of ALL_SUFFIXES) {
      expect(keys).toContain(`onboarding.aws.${suffix}`);
    }
  });
});

describe('clearOnboardingSession', () => {
  let storage: Record<string, string>;
  let originalSessionStorage: Storage;

  beforeEach(() => {
    storage = {};
    originalSessionStorage = window.sessionStorage;
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: (key: string) => storage[key] ?? null,
        setItem: (key: string, value: string) => {
          storage[key] = value;
        },
        removeItem: (key: string) => {
          delete storage[key];
        },
        clear: () => {
          storage = {};
        },
        get length() {
          return Object.keys(storage).length;
        },
        key: (index: number) => Object.keys(storage)[index] ?? null,
      },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'sessionStorage', {
      value: originalSessionStorage,
      writable: true,
    });
  });

  it('removes all five onboarding session keys', () => {
    for (const suffix of ALL_SUFFIXES) {
      storage[`onboarding.aws.${suffix}`] = 'some-value';
    }

    clearOnboardingSession('aws');

    for (const suffix of ALL_SUFFIXES) {
      expect(storage[`onboarding.aws.${suffix}`]).toBeUndefined();
    }
  });

  it('leaves unrelated keys intact', () => {
    storage['unrelated.key'] = 'keep-me';
    storage['onboarding.aws.servicesStep'] = 'remove-me';

    clearOnboardingSession('aws');

    expect(storage['unrelated.key']).toBe('keep-me');
    expect(storage['onboarding.aws.servicesStep']).toBeUndefined();
  });

  it('does not throw when sessionStorage access fails', () => {
    Object.defineProperty(window, 'sessionStorage', {
      get: () => {
        throw new DOMException('SecurityError');
      },
      configurable: true,
    });

    expect(() => clearOnboardingSession('aws')).not.toThrow();
  });
});
