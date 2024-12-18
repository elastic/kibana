/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesTelemetry, CollectTelemetryDataParams } from '../types';
import { getCountsAndMaxAlertsData } from './utils';

export const getAlertsTelemetryData = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<CasesTelemetry['comments']> => {
  const res = await getCountsAndMaxAlertsData({
    savedObjectsClient,
  });

  return res;
};
