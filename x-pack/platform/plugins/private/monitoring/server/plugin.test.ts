/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { coreMock } from '@kbn/core/server/mocks';
import { MonitoringPlugin } from './plugin';
import { RulesFactory } from './rules';

vi.mock('./es_client/instantiate_client', () => {
      const mocked = {
      instantiateClient: vi.fn().mockImplementation(() => ({
        cluster: {},
      })),
      instantiateLegacyClient: vi.fn().mockImplementation(() => ({
        cluster: {},
      })),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./license_service', () => {
      const mocked = {
      LicenseService: vi.fn().mockImplementation(() => ({
        setup: vi.fn().mockImplementation(() => ({})),
      })),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./kibana_monitoring/collectors', () => {
      const mocked = {
      registerCollectors: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./config', () => {
      const mocked = {
      createConfig: (config: any) => config,
    };
      return { ...mocked, default: mocked };
    });

describe('Monitoring plugin', () => {
  const coreSetup = coreMock.createSetup();
  coreSetup.http.getServerInfo.mockReturnValue({ port: 5601 } as any);

  const setupPlugins = {
    usageCollection: {
      getCollectorByType: vi.fn(),
      makeStatsCollector: vi.fn(),
      registerCollector: vi.fn(),
    },
    alerting: {
      registerType: vi.fn(),
    },
  };

  const defaultConfig = {
    ui: {
      elasticsearch: {},
    },
    kibana: {
      collection: {
        interval: 30000,
      },
    },
  };

  const initializerContext = coreMock.createPluginInitializerContext(defaultConfig);

  afterEach(() => {
    (setupPlugins.alerting.registerType as Mock).mockReset();
  });

  it('always create the bulk uploader', async () => {
    const plugin = new MonitoringPlugin(initializerContext as any);
    await plugin.setup(coreSetup, setupPlugins as any);
    // eslint-disable-next-line dot-notation
    expect(plugin['bulkUploader']).not.toBeUndefined();
  });

  it('should register all rules', async () => {
    const rules = RulesFactory.getAll();
    const plugin = new MonitoringPlugin(initializerContext as any);
    await plugin.setup(coreSetup as any, setupPlugins as any);
    expect(setupPlugins.alerting.registerType).toHaveBeenCalledTimes(rules.length);
  });
});
