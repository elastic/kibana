/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TelemetryOptInProvider } from './telemetry_opt_in';

describe('TelemetryOptInProvider', () => {
  const setup = ({ optedIn, simulatePostError }) => {
    const mockHttp = {
      post: jest.fn(async () => {
        if (simulatePostError) {
          return Promise.reject('Something happened');
        }
      })
    };

    const mockChrome = {
      addBasePath: (url) => url
    };

    const mockInjector = {
      get: (key) => {
        switch (key) {
          case 'telemetryOptedIn': {
            return optedIn;
          }
          case '$http': {
            return mockHttp;
          }
          default:
            throw new Error('unexpected injector request: ' + key);
        }
      }
    };

    const provider = new TelemetryOptInProvider(mockInjector, mockChrome);
    return {
      provider,
      mockHttp,
    };
  };


  it('should return the current opt-in status', () => {
    const { provider: optedInProvider } = setup({ optedIn: true });
    expect(optedInProvider.getOptIn()).toEqual(true);

    const { provider: optedOutProvider } = setup({ optedIn: false });
    expect(optedOutProvider.getOptIn()).toEqual(false);
  });

  it('should allow an opt-out to take place', async () => {
    const { provider, mockHttp } = setup({ optedIn: true });
    await provider.setOptIn(false);

    expect(mockHttp.post).toHaveBeenCalledWith(`/api/telemetry/v2/optIn`, { enabled: false });

    expect(provider.getOptIn()).toEqual(false);
  });

  it('should allow an opt-in to take place', async () => {
    const { provider, mockHttp } = setup({ optedIn: false });
    await provider.setOptIn(true);

    expect(mockHttp.post).toHaveBeenCalledWith(`/api/telemetry/v2/optIn`, { enabled: true });

    expect(provider.getOptIn()).toEqual(true);
  });

  it('should gracefully handle errors', async () => {
    const { provider, mockHttp } = setup({ optedIn: false, simulatePostError: true });
    await provider.setOptIn(true);

    expect(mockHttp.post).toHaveBeenCalledWith(`/api/telemetry/v2/optIn`, { enabled: true });

    // opt-in change should not be reflected
    expect(provider.getOptIn()).toEqual(false);
  });
});
