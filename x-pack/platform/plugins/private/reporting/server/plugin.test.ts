/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Logger,
  type PackageInfo,
} from '@kbn/core/server';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';

import { CSV_REPORT_TYPE, CSV_REPORT_TYPE_V2 } from '@kbn/reporting-export-types-csv-common';
import { PDF_REPORT_TYPE, PDF_REPORT_TYPE_V2 } from '@kbn/reporting-export-types-pdf-common';
import { PNG_REPORT_TYPE_V2 } from '@kbn/reporting-export-types-png-common';

import type { ReportingCore, ReportingInternalStart } from './core';
import { ReportingPlugin } from './plugin';
import { createMockPluginSetup, createMockPluginStart } from './test_helpers';
import type { ReportingSetupDeps } from './types';
import { ExportTypesRegistry } from '@kbn/reporting-server/export_types_registry';
import { FeaturesPluginSetup } from '@kbn/features-plugin/server';

const sleep = (time: number) => new Promise((r) => setTimeout(r, time));

describe('Reporting Plugin', () => {
  let configSchema: any;
  let initContext: any;
  let coreSetup: CoreSetup;
  let coreStart: CoreStart;
  let pluginSetup: ReportingSetupDeps;
  let pluginStart: ReportingInternalStart;
  let logger: jest.Mocked<Logger>;
  let plugin: ReportingPlugin;
  let featuresSetup: jest.Mocked<FeaturesPluginSetup>;

  beforeEach(async () => {
    jest.clearAllMocks();

    configSchema = createMockConfigSchema();
    initContext = coreMock.createPluginInitializerContext(configSchema);
    coreSetup = coreMock.createSetup(configSchema);
    coreStart = coreMock.createStart();
    featuresSetup = featuresPluginMock.createSetup();
    pluginSetup = createMockPluginSetup({
      features: featuresSetup,
    }) as unknown as ReportingSetupDeps;
    pluginStart = await createMockPluginStart(coreStart, configSchema);

    logger = loggingSystemMock.createLogger();
    plugin = new ReportingPlugin(initContext);
    (plugin as unknown as { logger: Logger }).logger = logger;
  });

  it('has a sync setup process', () => {
    expect(plugin.setup(coreSetup, pluginSetup)).not.toHaveProperty('then');
  });

  it('has a sync startup process', async () => {
    plugin.setup(coreSetup, pluginSetup);
    await sleep(5);
    expect(plugin.start(coreStart, pluginStart)).not.toHaveProperty('then');
  });

  it('registers an advanced setting for PDF logos', async () => {
    plugin.setup(coreSetup, pluginSetup);
    expect(coreSetup.uiSettings.register).toHaveBeenCalled();
    expect((coreSetup.uiSettings.register as jest.Mock).mock.calls[0][0]).toHaveProperty(
      'xpackReporting:customPdfLogo'
    );
  });

  it('logs start issues', async () => {
    // wait for the setup phase background work
    plugin.setup(coreSetup, pluginSetup);
    await new Promise(setImmediate);

    // create a way for an error to happen
    const reportingCore = (plugin as unknown as { reportingCore: ReportingCore }).reportingCore;
    reportingCore.pluginStart = jest.fn().mockRejectedValueOnce('silly');

    // wait for the startup phase background work
    plugin.start(coreStart, pluginStart);
    await new Promise(setImmediate);

    expect(logger.error.mock.calls.map(([message]) => message)).toMatchInlineSnapshot(`
      Array [
        "Error in Reporting start, reporting may not function properly",
        "silly",
      ]
    `);
    expect(logger.error).toHaveBeenCalledTimes(2);
  });

  it('logs the hash for the security encryption key', () => {
    plugin.setup(coreSetup, pluginSetup);

    expect(logger.info.mock.calls.map(([message]) => message)).toMatchInlineSnapshot(`
      Array [
        "Hashed 'xpack.reporting.encryptionKey' for this instance: VQT++jjB3Ks9FX3E8a/bRTHqUj4LLcys+afhSkTsX4o=",
      ]
    `);
    expect(logger.info).toHaveBeenCalledTimes(1);
  });

  describe('config and export types registration', () => {
    jest.mock('@kbn/reporting-server/export_types_registry');
    ExportTypesRegistry.prototype.getAll = jest.fn(() => []); // code breaks if getAll returns undefined
    let registerSpy: jest.SpyInstance;

    beforeEach(async () => {
      registerSpy = jest.spyOn(ExportTypesRegistry.prototype, 'register');
      pluginSetup = createMockPluginSetup({}) as unknown as ReportingSetupDeps;
      pluginStart = await createMockPluginStart(coreStart, configSchema);
      plugin = new ReportingPlugin(initContext);
    });

    it('expect all report types to be in registry', async () => {
      // check the spy function
      expect(registerSpy).toHaveBeenCalledTimes(5);
      expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ id: CSV_REPORT_TYPE }));
      expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ id: CSV_REPORT_TYPE_V2 }));
      expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ id: PDF_REPORT_TYPE }));
      expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ id: PDF_REPORT_TYPE_V2 }));
      expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ id: PNG_REPORT_TYPE_V2 }));
    });

    it('expect image report types not to be in registry if disabled', async () => {
      jest.clearAllMocks();

      configSchema = createMockConfigSchema({
        export_types: {
          csv: { enabled: true },
          pdf: { enabled: false },
          png: { enabled: false },
        },
      });

      initContext = coreMock.createPluginInitializerContext(configSchema);
      coreSetup = coreMock.createSetup(configSchema);
      coreStart = coreMock.createStart();
      pluginSetup = createMockPluginSetup({}) as unknown as ReportingSetupDeps;
      pluginStart = await createMockPluginStart(coreStart, configSchema);
      plugin = new ReportingPlugin(initContext);

      // check the spy function was called with CSV
      expect(registerSpy).toHaveBeenCalledTimes(2);
      expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ id: CSV_REPORT_TYPE }));
      expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ id: CSV_REPORT_TYPE_V2 }));

      // check the spy function was NOT called with anything else
      expect(registerSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: PDF_REPORT_TYPE })
      );
      expect(registerSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: PDF_REPORT_TYPE_V2 })
      );
      expect(registerSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: PNG_REPORT_TYPE_V2 })
      );
    });
  });

  describe('features registration', () => {
    it('does not register Kibana reporting feature in traditional build flavour', async () => {
      plugin.setup(coreSetup, pluginSetup);
      expect(featuresSetup.registerKibanaFeature).not.toHaveBeenCalled();
      expect(featuresSetup.enableReportingUiCapabilities).toHaveBeenCalledTimes(1);
    });

    it('registers Kibana reporting feature in serverless build flavour', async () => {
      const serverlessInitContext = coreMock.createPluginInitializerContext(configSchema);
      // Force type-cast to convert `ReadOnly<PackageInfo>` to mutable `PackageInfo`.
      (serverlessInitContext.env.packageInfo as PackageInfo).buildFlavor = 'serverless';
      plugin = new ReportingPlugin(serverlessInitContext);

      plugin.setup(coreSetup, pluginSetup);
      expect(featuresSetup.registerKibanaFeature).toHaveBeenCalledTimes(1);
      expect(featuresSetup.registerKibanaFeature).toHaveBeenCalledWith({
        id: 'reporting',
        name: 'Reporting',
        category: DEFAULT_APP_CATEGORIES.management,
        scope: ['spaces', 'security'],
        app: [],
        privileges: {
          all: { savedObject: { all: [], read: [] }, ui: [] },
          read: { disabled: true, savedObject: { all: [], read: [] }, ui: [] },
        },
      });
      expect(featuresSetup.enableReportingUiCapabilities).toHaveBeenCalledTimes(1);
    });
  });
});
