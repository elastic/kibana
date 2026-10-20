/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import type { FeatureFlagsStart } from '@kbn/core/server';
import { ScheduleType } from '@kbn/reporting-server';
import {
  REPORTING_SERVERLESS_ON_DEMAND_EXPORT_ENABLED,
  REPORTING_SERVERLESS_SCHEDULED_EXPORT_ENABLED,
} from '../../common/feature_flags';
import { isScreenshotExportType } from './screenshotting_availability';

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
  if (!isServerless || !isScreenshotExportType(exportTypeId)) {
    return true;
  }

  const flag =
    scheduleType === ScheduleType.SCHEDULED
      ? REPORTING_SERVERLESS_SCHEDULED_EXPORT_ENABLED
      : REPORTING_SERVERLESS_ON_DEMAND_EXPORT_ENABLED;

  // oxlint-disable-next-line @kbn/eslint/no_feature_flag_snapshot -- called on every report request and task run, so each check reads the current flag value
  return firstValueFrom(featureFlags.getBooleanValue$(flag, false));
}
