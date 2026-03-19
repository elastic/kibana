/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { SearchInferenceEndpointsPlugin } from './plugin';
import {
  INFERENCE_ENDPOINTS_APP_ID,
  MODEL_SETTINGS_APP_ID,
  PLUGIN_ID,
  PLUGIN_NAME,
} from '../common/constants';
import type { SearchInferenceEndpointsConfig } from './config';

describe('SearchInferenceEndpointsPlugin', () => {
  let plugin: SearchInferenceEndpointsPlugin;
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let features: ReturnType<typeof featuresPluginMock.createSetup>;

  beforeEach(() => {
    const context = coreMock.createPluginInitializerContext<SearchInferenceEndpointsConfig>({
      enabled: true,
      ui: { enabled: true },
      dynamicConnectors: { enabled: false, pollingIntervalMins: 15 },
    });
    plugin = new SearchInferenceEndpointsPlugin(context);
    coreSetup = coreMock.createSetup();
    features = featuresPluginMock.createSetup();
  });

  describe('setup()', () => {
    it('registers routes', () => {
      plugin.setup(coreSetup, { features });

      expect(coreSetup.http.createRouter).toHaveBeenCalledTimes(1);
    });

    it('registers the kibana feature with correct properties', () => {
      plugin.setup(coreSetup, { features });

      expect(features.registerKibanaFeature).toHaveBeenCalledTimes(1);

      const feature = features.registerKibanaFeature.mock.calls[0][0];

      expect(feature).toMatchObject({
        id: PLUGIN_ID,
        name: PLUGIN_NAME,
        minimumLicense: 'enterprise',
        category: DEFAULT_APP_CATEGORIES.management,
        management: {
          ml: [INFERENCE_ENDPOINTS_APP_ID, MODEL_SETTINGS_APP_ID],
        },
      });
    });

    it('registers feature with all privilege granting management access', () => {
      plugin.setup(coreSetup, { features });

      const feature = features.registerKibanaFeature.mock.calls[0][0];

      expect(feature.privileges?.all).toMatchObject({
        management: {
          ml: [INFERENCE_ENDPOINTS_APP_ID, MODEL_SETTINGS_APP_ID],
        },
      });
    });

    it('registers feature with read privilege disabled', () => {
      plugin.setup(coreSetup, { features });

      const feature = features.registerKibanaFeature.mock.calls[0][0];

      expect(feature.privileges?.read).toMatchObject({
        disabled: true,
      });
    });
  });
});
