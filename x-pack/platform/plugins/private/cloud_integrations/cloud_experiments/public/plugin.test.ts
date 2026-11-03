/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { duration } from 'moment';
import { coreMock } from '@kbn/core/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { OFREPWebProviderMocked } from './plugin.test.mocks';
import { CloudExperimentsPlugin } from './plugin';
import { MetadataService } from '../common/metadata_service';

describe('Cloud Experiments public plugin', () => {
  jest.spyOn(console, 'debug').mockImplementation(); // silence console.debug logs

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('successfully creates a new plugin if provided an empty configuration', () => {
      const initializerContext = coreMock.createPluginInitializerContext();
      initializerContext.env.mode = {
        name: 'development',
        dev: true, // ensure it's true
        prod: false,
      };
      const plugin = new CloudExperimentsPlugin(initializerContext);
      expect(plugin).toHaveProperty('setup');
      expect(plugin).toHaveProperty('start');
      expect(plugin).toHaveProperty('stop');
      expect(plugin).toHaveProperty('metadataService', expect.any(MetadataService));
    });

    test('does not require a LaunchDarkly client id in production', () => {
      const initializerContext = coreMock.createPluginInitializerContext();
      initializerContext.env.mode = {
        name: 'production',
        dev: false,
        prod: true,
      };
      expect(() => new CloudExperimentsPlugin(initializerContext)).not.toThrow();
    });
  });

  const createCoreSetup = (basePath = '') => coreMock.createSetup({ basePath });

  describe('setup', () => {
    let plugin: CloudExperimentsPlugin;

    beforeEach(() => {
      const initializerContext = coreMock.createPluginInitializerContext({
        metadata_refresh_interval: duration(1, 'h'),
      });
      plugin = new CloudExperimentsPlugin(initializerContext);
    });

    afterEach(() => {
      plugin.stop();
    });

    test('returns no contract', () => {
      expect(
        plugin.setup(createCoreSetup(), {
          cloud: cloudMock.createSetup(),
        })
      ).toBeUndefined();
    });

    test('points the OFREP provider at Kibana and seeds it with the injected flags', () => {
      const coreSetup = createCoreSetup('/kbn');
      coreSetup.featureFlags.getInitialFeatureFlags.mockReturnValue({
        'my-initial-flag': true,
      });
      plugin.setup(coreSetup, { cloud: cloudMock.createSetup() });

      expect(OFREPWebProviderMocked).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: `${window.location.origin}/kbn/internal/feature-flags/`,
          pollInterval: 30_000,
          changeDetection: 'polling',
          cacheMode: 'network-first',
          headers: expect.arrayContaining([
            ['kbn-version', 'version'],
            ['kbn-xsrf', 'kibana'],
            ['x-elastic-internal-origin', 'Kibana'],
          ]),
        })
      );
      expect(coreSetup.featureFlags.setProvider).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { name: 'Kibana OFREP provider' } })
      );
      expect(
        coreSetup.featureFlags.setProvider.mock.calls[0][0].resolveBooleanEvaluation(
          'my-initial-flag',
          false,
          {},
          { error() {}, warn() {}, info() {}, debug() {} }
        )
      ).toEqual({ value: true, reason: 'CACHED' });
    });
  });

  describe('start', () => {
    let plugin: CloudExperimentsPlugin;

    beforeEach(() => {
      const initializerContext = coreMock.createPluginInitializerContext({
        metadata_refresh_interval: duration(1, 'h'),
      });
      plugin = new CloudExperimentsPlugin(initializerContext);
    });

    afterEach(() => {
      plugin.stop();
    });

    test('returns the contract', () => {
      plugin.setup(createCoreSetup(), { cloud: cloudMock.createSetup() });
      const startContract = plugin.start(coreMock.createStart(), {
        dataViews: dataViewPluginMocks.createStartContract(),
      });
      expect(startContract).toBeUndefined();
    });

    test('updates the context with `has_data`', async () => {
      const coreSetup = createCoreSetup();
      plugin.setup(coreSetup, {
        cloud: { ...cloudMock.createSetup(), isCloudEnabled: true },
      });

      const dataViews = dataViewPluginMocks.createStartContract();
      plugin.start(coreMock.createStart(), { dataViews });

      // After scheduler kicks in...
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(coreSetup.featureFlags.appendContext).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'multi',
          kibana: expect.objectContaining({
            has_data: true,
          }),
        })
      );
    });
  });

  describe('stop', () => {
    let plugin: CloudExperimentsPlugin;

    beforeEach(() => {
      const initializerContext = coreMock.createPluginInitializerContext({
        metadata_refresh_interval: duration(1, 'h'),
      });
      plugin = new CloudExperimentsPlugin(initializerContext);
      plugin.setup(createCoreSetup(), {
        cloud: { ...cloudMock.createSetup(), isCloudEnabled: true },
      });
      plugin.start(coreMock.createStart(), {
        dataViews: dataViewPluginMocks.createStartContract(),
      });
    });

    test('flushes the events on stop', () => {
      // eslint-disable-next-line dot-notation
      const metadataServiceStopSpy = jest.spyOn(plugin['metadataService'], 'stop');
      expect(() => plugin.stop()).not.toThrow();
      expect(metadataServiceStopSpy).toHaveBeenCalledTimes(1);
    });
  });
});
