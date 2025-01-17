/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getResultTestConfig } from './alerts';

describe('getResultTestConfig', () => {
  test('provides default config for new rule', () => {
    expect(getResultTestConfig(undefined)).toEqual({
      healthCheck: {
        enabled: true,
      },
      notStarted: {
        enabled: true,
      },
      errorMessages: {
        enabled: false,
      },
    });
  });

  test('provides config for rule created with default settings', () => {
    expect(getResultTestConfig(null)).toEqual({
      healthCheck: {
        enabled: true,
      },
      notStarted: {
        enabled: true,
      },
      errorMessages: {
        enabled: false,
      },
    });
  });

  test('completes already defined config', () => {
    expect(
      getResultTestConfig({
        healthCheck: null,
        notStarted: null,
        errorMessages: {
          enabled: false,
        },
      })
    ).toEqual({
      healthCheck: {
        enabled: false,
      },
      notStarted: {
        enabled: true,
      },
      errorMessages: {
        enabled: false,
      },
    });
  });

  test('sets healthCheck based on the errorMessages', () => {
    expect(
      getResultTestConfig({
        healthCheck: null,
        notStarted: null,
        errorMessages: {
          enabled: true,
        },
      })
    ).toEqual({
      healthCheck: {
        enabled: false,
      },
      notStarted: {
        enabled: true,
      },
      errorMessages: {
        enabled: true,
      },
    });
  });

  test('preserves complete config', () => {
    expect(
      getResultTestConfig({
        healthCheck: {
          enabled: false,
        },
        notStarted: {
          enabled: true,
        },
        errorMessages: {
          enabled: true,
        },
      })
    ).toEqual({
      healthCheck: {
        enabled: false,
      },
      notStarted: {
        enabled: true,
      },
      errorMessages: {
        enabled: true,
      },
    });
  });
});
