/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart, TelemetryCounter } from '@kbn/core/public';
import { filter, firstValueFrom } from 'rxjs';

export const isTelemetryBeingSent = async (
  analytics: AnalyticsServiceStart
): Promise<TelemetryCounter> =>
  firstValueFrom(
    analytics.telemetryCounter$.pipe(filter((counter) => counter.type === 'succeeded'))
  );
