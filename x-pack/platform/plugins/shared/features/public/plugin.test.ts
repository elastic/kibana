/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { FeaturesPlugin } from './plugin';

import { coreMock, httpServiceMock } from '@kbn/core/public/mocks';

vi.mock('./features_api_client', () => {
  const instance = {
    getFeatures: vi.fn(),
  };
  return {
    FeaturesAPIClient: vi.fn().mockImplementation(() => instance),
  };
});

import { FeaturesAPIClient } from './features_api_client';

describe('Features Plugin', () => {
  describe('#setup', () => {
    it('returns expected public contract', () => {
      const plugin = new FeaturesPlugin();
      expect(plugin.setup(coreMock.createSetup())).toMatchInlineSnapshot(`undefined`);
    });
  });

  describe('#start', () => {
    it('returns expected public contract', () => {
      const plugin = new FeaturesPlugin();
      plugin.setup(coreMock.createSetup());

      expect(plugin.start()).toMatchInlineSnapshot(`
        Object {
          "getFeatures": [Function],
        }
      `);
    });

    it('#getFeatures calls the underlying FeaturesAPIClient', () => {
      const plugin = new FeaturesPlugin();
      const apiClient = new FeaturesAPIClient(httpServiceMock.createSetupContract());

      plugin.setup(coreMock.createSetup());

      const start = plugin.start();
      start.getFeatures();
      expect(apiClient.getFeatures).toHaveBeenCalledTimes(1);
    });
  });
});
