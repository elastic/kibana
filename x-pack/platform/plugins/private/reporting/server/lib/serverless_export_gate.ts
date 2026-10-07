/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import type { FeatureFlagsStart } from '@kbn/core/server';
import { PDF_REPORT_TYPE, PDF_REPORT_TYPE_V2 } from '@kbn/reporting-export-types-pdf-common';
import { PNG_REPORT_TYPE_V2 } from '@kbn/reporting-export-types-png-common';
import { ScheduleType } from '@kbn/reporting-server';
import {
  REPORTING_SERVERLESS_ON_DEMAND_EXPORT_ENABLED,
  REPORTING_SERVERLESS_SCHEDULED_EXPORT_ENABLED,
} from '../../common/feature_flags';

const SCREENSHOT_EXPORT_TYPE_IDS = new Set([
  PDF_REPORT_TYPE,
  PDF_REPORT_TYPE_V2,
  PNG_REPORT_TYPE_V2,
]);

export async function isServerlessExportEnabled({
  isServerless,
  featureFlags,
  exportTypeId,
  scheduleType,
}: {
  isServerless: boolean;
  featureFlags: FeatureFlagsStart;
  exportTypeId: string;
  scheduleType: ScheduleType;
}): Promise<boolean> {
  if (!isServerless || !SCREENSHOT_EXPORT_TYPE_IDS.has(exportTypeId)) {
    return true;
  }

  const flag =
    scheduleType === ScheduleType.SCHEDULED
      ? REPORTING_SERVERLESS_SCHEDULED_EXPORT_ENABLED
      : REPORTING_SERVERLESS_ON_DEMAND_EXPORT_ENABLED;

  return firstValueFrom(featureFlags.getBooleanValue$(flag, false));
}
