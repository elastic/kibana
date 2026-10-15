/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
  OWNERS,
} from '../../../common/constants';
import type { Owner } from '../../../common/constants/types';
import type {
  AlertCounts,
  CasesTelemetry,
  CollectTelemetryDataParams,
  CountsAndMaxAlertsAggRes,
} from '../types';
import type { TelemetrySavedObjectsClient } from '../telemetry_saved_objects_client';
import {
  getAlertsCountsAggregationQuery,
  getAlertsCountsFromBuckets,
  getMaxCounterOnACase,
  getOnlyAlertsCommentsFilter,
  getOnlyUnifiedAlertsFilter,
  getUniqueAlertCommentsCountQuery,
} from './utils';

const queryAlertsCountsAndMax = async ({
  savedObjectsClient,
  savedObjectType,
  alertField,
  filter,
}: {
  savedObjectsClient: TelemetrySavedObjectsClient;
  savedObjectType: string;
  alertField: string;
  filter?: KueryNode;
}) =>
  savedObjectsClient.find<unknown, CountsAndMaxAlertsAggRes>({
    page: 0,
    perPage: 0,
    filter,
    type: savedObjectType,
    namespaces: ['*'],
    aggs: {
      by_owner: {
        terms: {
          field: `${savedObjectType}.attributes.owner`,
          size: OWNERS.length,
          include: [...OWNERS],
        },
        aggs: {
          ...getAlertsCountsAggregationQuery(savedObjectType, alertField),
          ...getUniqueAlertCommentsCountQuery(savedObjectType, alertField),
        },
      },
    },
  });

const mergeAlertCounts = (legacy: AlertCounts, unified: AlertCounts): AlertCounts => ({
  total: legacy.total + unified.total,
  daily: legacy.daily + unified.daily,
  weekly: legacy.weekly + unified.weekly,
  monthly: legacy.monthly + unified.monthly,
});

const getSolutionStats = (
  owner: Owner,
  countsAndMaxAlertsAggRes?: CountsAndMaxAlertsAggRes
): AlertCounts => {
  const bucket = countsAndMaxAlertsAggRes?.by_owner?.buckets?.find((b) => b?.key === owner);
  if (!bucket) {
    return {
      total: 0,
      daily: 0,
      weekly: 0,
      monthly: 0,
    };
  }

  return {
    total: bucket?.uniqueAlertCommentsCount?.value ?? 0,
    ...getAlertsCountsFromBuckets(bucket?.counts?.buckets ?? []),
  };
};

const getTotalStats = (countsAndMaxAlertsAggRes?: CountsAndMaxAlertsAggRes): AlertCounts => {
  const buckets = countsAndMaxAlertsAggRes?.by_owner?.buckets ?? [];
  return buckets.reduce(
    (acc, bucket) => {
      acc.total += bucket?.uniqueAlertCommentsCount?.value ?? 0;
      const counts = getAlertsCountsFromBuckets(bucket?.counts?.buckets ?? []);
      acc.daily += counts.daily;
      acc.weekly += counts.weekly;
      acc.monthly += counts.monthly;
      return acc;
    },
    { total: 0, daily: 0, weekly: 0, monthly: 0 }
  );
};

export const getAlertsTelemetryData = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<CasesTelemetry['alerts']> => {
  // Alerts can live in `cases-comments` and `cases-attachments`.
  // Query both and merge so telemetry stays accurate
  // `maxOnACase` is sourced from the case `total_alerts` counter
  const [legacyRes, unifiedRes, maxAlerts] = await Promise.all([
    queryAlertsCountsAndMax({
      savedObjectsClient,
      savedObjectType: CASE_COMMENT_SAVED_OBJECT,
      alertField: 'alertId',
      filter: getOnlyAlertsCommentsFilter(),
    }),
    queryAlertsCountsAndMax({
      savedObjectsClient,
      savedObjectType: CASE_ATTACHMENT_SAVED_OBJECT,
      alertField: 'attachmentId',
      filter: getOnlyUnifiedAlertsFilter(),
    }),
    getMaxCounterOnACase(savedObjectsClient, 'total_alerts', { byOwner: true }),
  ]);

  const mergeForOwner = (owner: Owner) =>
    mergeAlertCounts(
      getSolutionStats(owner, legacyRes?.aggregations),
      getSolutionStats(owner, unifiedRes?.aggregations)
    );

  return {
    all: {
      ...mergeAlertCounts(
        getTotalStats(legacyRes?.aggregations),
        getTotalStats(unifiedRes?.aggregations)
      ),
      maxOnACase: maxAlerts.all,
    },
    sec: { ...mergeForOwner('securitySolution'), maxOnACase: maxAlerts.byOwner.securitySolution },
    obs: { ...mergeForOwner('observability'), maxOnACase: maxAlerts.byOwner.observability },
    main: { ...mergeForOwner('cases'), maxOnACase: maxAlerts.byOwner.cases },
  };
};
