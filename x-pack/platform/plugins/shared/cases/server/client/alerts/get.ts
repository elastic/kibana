/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MgetResponseItem, GetGetResult } from '@elastic/elasticsearch/lib/api/types';
import type { CasesClientGetAlertsResponse } from './types';
import type { CasesClientArgs } from '..';
import type { AlertInfo } from '../../common/types';

function isAlert(
  doc?: MgetResponseItem<Record<string, unknown>>
): doc is GetGetResult<Record<string, unknown>> {
  return Boolean(doc && !('error' in doc) && '_source' in doc);
}

export const getAlerts = async (
  alertsInfo: AlertInfo[],
  clientArgs: CasesClientArgs
): Promise<CasesClientGetAlertsResponse> => {
  const { alertsService } = clientArgs.services;
  if (alertsInfo.length === 0) {
    return [];
  }

  const alerts = await alertsService.getAlerts(alertsInfo);
  if (!alerts) {
    return [];
  }

  return alerts.docs.filter(isAlert).map((alert) => ({
    id: alert._id,
    index: alert._index,
    ...alert._source,
  }));
};
