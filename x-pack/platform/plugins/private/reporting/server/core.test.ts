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
import { ScheduleType } from '@kbn/reporting-server';
import { createMockPluginStart, createMockReportingCore } from './test_helpers';

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
