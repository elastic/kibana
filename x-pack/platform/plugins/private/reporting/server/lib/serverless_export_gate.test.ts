/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { coreFeatureFlagsMock } from '@kbn/core/server/mocks';
import { CSV_REPORT_TYPE_V2 } from '@kbn/reporting-export-types-csv-common';
import { PDF_REPORT_TYPE, PDF_REPORT_TYPE_V2 } from '@kbn/reporting-export-types-pdf-common';
import { PNG_REPORT_TYPE_V2 } from '@kbn/reporting-export-types-png-common';
import { ScheduleType } from '@kbn/reporting-server';
import {
  REPORTING_SERVERLESS_ON_DEMAND_EXPORT_ENABLED,
  REPORTING_SERVERLESS_SCHEDULED_EXPORT_ENABLED,
} from '../../common/feature_flags';
import { isServerlessExportEnabled } from './serverless_export_gate';

const createFeatureFlags = (enabledFlags: string[]) => {
  const featureFlags = coreFeatureFlagsMock.createStart();
  featureFlags.getBooleanValue$.mockImplementation((flagName) =>
    of(enabledFlags.includes(flagName))
  );
  return featureFlags;
};

describe('isServerlessExportEnabled', () => {
  it('allows every export type outside serverless without reading flags', async () => {
    const featureFlags = createFeatureFlags([]);

    await expect(
      isServerlessExportEnabled({
        isServerless: false,
        featureFlags,
        exportTypeId: PDF_REPORT_TYPE_V2,
        scheduleType: ScheduleType.SINGLE,
      })
    ).resolves.toBe(true);
    expect(featureFlags.getBooleanValue$).not.toHaveBeenCalled();
  });

  it('allows CSV on serverless without reading flags', async () => {
    const featureFlags = createFeatureFlags([]);

    await expect(
      isServerlessExportEnabled({
        isServerless: true,
        featureFlags,
        exportTypeId: CSV_REPORT_TYPE_V2,
        scheduleType: ScheduleType.SCHEDULED,
      })
    ).resolves.toBe(true);
    expect(featureFlags.getBooleanValue$).not.toHaveBeenCalled();
  });

  it.each([PDF_REPORT_TYPE, PDF_REPORT_TYPE_V2, PNG_REPORT_TYPE_V2])(
    'gates on-demand %s on the on-demand flag',
    async (exportTypeId) => {
      const opts = { isServerless: true, exportTypeId, scheduleType: ScheduleType.SINGLE };

      await expect(
        isServerlessExportEnabled({
          ...opts,
          featureFlags: createFeatureFlags([REPORTING_SERVERLESS_ON_DEMAND_EXPORT_ENABLED]),
        })
      ).resolves.toBe(true);
      await expect(
        isServerlessExportEnabled({
          ...opts,
          featureFlags: createFeatureFlags([REPORTING_SERVERLESS_SCHEDULED_EXPORT_ENABLED]),
        })
      ).resolves.toBe(false);
    }
  );

  it.each([PDF_REPORT_TYPE, PDF_REPORT_TYPE_V2, PNG_REPORT_TYPE_V2])(
    'gates scheduled %s on the scheduled flag',
    async (exportTypeId) => {
      const opts = { isServerless: true, exportTypeId, scheduleType: ScheduleType.SCHEDULED };

      await expect(
        isServerlessExportEnabled({
          ...opts,
          featureFlags: createFeatureFlags([REPORTING_SERVERLESS_SCHEDULED_EXPORT_ENABLED]),
        })
      ).resolves.toBe(true);
      await expect(
        isServerlessExportEnabled({
          ...opts,
          featureFlags: createFeatureFlags([REPORTING_SERVERLESS_ON_DEMAND_EXPORT_ENABLED]),
        })
      ).resolves.toBe(false);
    }
  );

  it('defaults the flags to off', async () => {
    const featureFlags = coreFeatureFlagsMock.createStart();

    await expect(
      isServerlessExportEnabled({
        isServerless: true,
        featureFlags,
        exportTypeId: PNG_REPORT_TYPE_V2,
        scheduleType: ScheduleType.SINGLE,
      })
    ).resolves.toBe(false);
    expect(featureFlags.getBooleanValue$).toHaveBeenCalledWith(
      REPORTING_SERVERLESS_ON_DEMAND_EXPORT_ENABLED,
      false
    );
  });
});
