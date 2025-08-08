/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MgetResponseItem, GetGetResult } from '@elastic/elasticsearch/lib/api/types';
import { ALERT_GROUPING, TAGS } from '@kbn/rule-data-utils';
import { flattenObject } from '@kbn/object-utils';
import type { CaseMetadata } from '../../../common/types/domain';
import { AttachmentType } from '../../../common/types/domain';
import type { AttachmentAttributes } from '../../../common';
import type { AlertInfo } from '../../common/types';
import type { CasesClientArgs } from '..';
import type { CasesClientGetAlertsResponse } from './types';
import { getIDsAndIndicesAsArrays } from '../../common/utils';

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

export const getAlertMetadataFromComments = async (
  comments: AttachmentAttributes[],
  clientArgs: CasesClientArgs
): Promise<CaseMetadata> => {
  const alertInfo: AlertInfo[] = comments.flatMap((c) => {
    if (c.type === AttachmentType.alert) {
      const { ids, indices } = getIDsAndIndicesAsArrays(c);
      return ids.map((alertId, index) => ({ id: alertId, index: indices[index] }));
    }
    return [];
  });

  const alertsDocs = await getAlerts(alertInfo, clientArgs);

  const metadata = alertsDocs.reduce<Record<string, Set<string>>>(
    (acc, alert) => {
      const { [TAGS]: tags = [], [ALERT_GROUPING]: grouping } = alert;

      tags.forEach((t) => {
        acc.tags.add(t);
      });

      if (grouping) {
        Object.entries(flattenObject(grouping)).forEach(([k, v]) => {
          if (typeof v !== 'string') return;
          (acc[k] ??= new Set()).add(v);
        });
      }
      return acc;
    },
    { tags: new Set() }
  );

  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [key, Array.from(value)])
  );
};
