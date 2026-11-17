/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CSV_REPORT_TYPE_V2 } from '@kbn/reporting-export-types-csv-common';
import { PDF_REPORT_TYPE_V2 } from '@kbn/reporting-export-types-pdf-common';
import { PNG_REPORT_TYPE_V2 } from '@kbn/reporting-export-types-png-common';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { ExportType, ScheduleType } from '@kbn/reporting-server';
import { LICENSE_TYPE_BASIC } from '@kbn/reporting-common';
import { ExportTypesRegistry } from '@kbn/reporting-server/export_types_registry';
import { coreMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { ReportingCore } from './core';
import {
  createMockPluginSetup,
  createMockPluginStart,
  createMockReportingCore,
} from './test_helpers';

class TestExportType extends ExportType {
  id = 'test_export_type';
  name = 'Test';
  jobType = 'test_job';
  jobContentEncoding = 'csv' as const;
  jobContentExtension = 'csv' as const;
  validLicenses = [LICENSE_TYPE_BASIC];
  createJob = jest.fn();
  runTask = jest.fn();
  setup = jest.fn();
  start = jest.fn();
}

describe('ReportingCore.isExportTypeEnabled', () => {
  it('rejects PDF and PNG, but not CSV, when no screenshotting implementation is enabled', async () => {
    const config = createMockConfigSchema({});
    const reportingCore = await createMockReportingCore(
      config,
      undefined,
      await createMockPluginStart({ screenshotting: undefined }, config)
    );

    expect(await reportingCore.isExportTypeEnabled(PDF_REPORT_TYPE_V2, ScheduleType.SINGLE)).toBe(
      false
    );
    expect(await reportingCore.isExportTypeEnabled(PNG_REPORT_TYPE_V2, ScheduleType.SINGLE)).toBe(
      false
    );
    expect(await reportingCore.isExportTypeEnabled(CSV_REPORT_TYPE_V2, ScheduleType.SINGLE)).toBe(
      true
    );
  });

  it('allows PDF when a screenshotting implementation is enabled', async () => {
    const config = createMockConfigSchema({});
    const reportingCore = await createMockReportingCore(
      config,
      undefined,
      await createMockPluginStart({}, config)
    );

    expect(await reportingCore.isExportTypeEnabled(PDF_REPORT_TYPE_V2, ScheduleType.SINGLE)).toBe(
      true
    );
  });
});

describe('ReportingCore registerExportTypes', () => {
  it('builds the export type with the Reporting config and initializes it', async () => {
    const config = createMockConfigSchema({});
    const reportingCore = await createMockReportingCore(config);
    let exportType: TestExportType | undefined;

    reportingCore.getContract().registerExportTypes((deps) => {
      expect(deps.config).toBe(reportingCore.getConfig());
      exportType = new TestExportType(deps.core, deps.config, deps.logger, deps.context);
      return exportType;
    });

    expect(reportingCore.getExportTypesRegistry().getById('test_export_type')).toBe(exportType);
    expect(exportType?.setup).toHaveBeenCalledTimes(1);
    expect(exportType?.start).toHaveBeenCalledTimes(1);
  });

  it('rejects an export type id that is already registered', async () => {
    const reportingCore = await createMockReportingCore(createMockConfigSchema({}));
    const { registerExportTypes } = reportingCore.getContract();
    const create = (deps: Parameters<Parameters<typeof registerExportTypes>[0]>[0]) =>
      new TestExportType(deps.core, deps.config, deps.logger, deps.context);

    registerExportTypes(create);

    expect(() => registerExportTypes(create)).toThrow(/already been registered/);
  });

  it('initializes a type registered before setup and start when they run', async () => {
    const config = createMockConfigSchema({});
    const context = coreMock.createPluginInitializerContext(createMockConfigSchema());
    context.config = { get: () => config } as never;
    const reportingCore = new ReportingCore(
      coreMock.createSetup(),
      loggingSystemMock.createLogger(),
      new ExportTypesRegistry(licensingMock.createSetup()),
      context
    );
    let exportType: TestExportType | undefined;
    reportingCore.getContract().registerExportTypes((deps) => {
      exportType = new TestExportType(deps.core, deps.config, deps.logger, deps.context);
      return exportType;
    });
    const setupDeps = createMockPluginSetup({});
    const startDeps = await createMockPluginStart({}, config);

    expect(exportType?.setup).not.toHaveBeenCalled();

    reportingCore.pluginSetup(setupDeps);
    await reportingCore.pluginStart(startDeps);

    expect(exportType?.setup).toHaveBeenCalledWith(setupDeps);
    expect(exportType?.start).toHaveBeenCalledTimes(1);
  });
});
