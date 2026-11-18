/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { MAX_KPI_ALERTS } from '../../../../common/constants';
import type { KpiMetricResult } from '../../../../common/types/api';
import type { PredefinedKpiMetricConfiguration } from '../../../../common/types/domain';
import { AttachmentType } from '../../../../common/types/domain';
import { UNIFIED_ALERT_TYPES_ARRAY } from '../../../../common/utils/attachments';
import type { CasesAnalyticsV2ReaderContract } from '../../../cases_analytics_v2/reader';
import type { AlertGeneratedTimes, AlertService } from '../../../services/alerts';
import { getPreviousPeriod } from './period';
import type { KpiQueryContext, KpiSearchRequest } from './query_builder';
import { buildForcedFilters } from './query_builder';
import { isIncompleteKpiSearchResponse, toKpiMetricError } from './result';

type AlertDurationAggregation = 'avg' | 'median';

const AGGREGATION_BY_METRIC_ID: Readonly<Record<string, AlertDurationAggregation>> = {
  alert_time_to_acknowledge_avg: 'avg',
  alert_time_to_acknowledge_median: 'median',
};

const ALERT_ATTACHMENT_TYPES: readonly string[] = [
  AttachmentType.alert,
  ...UNIFIED_ALERT_TYPES_ARRAY,
];

const LIMIT_MESSAGE = `More than ${MAX_KPI_ALERTS} alerts are attached in this range. Select a shorter range to see this metric.`;
const UNREADABLE_MESSAGE = 'You do not have permission to read the alerts of these cases.';
const FAILED_MESSAGE = 'The metric search failed.';
const INCOMPLETE_MESSAGE = 'The metric search returned incomplete results.';

interface AlertAttachmentSource {
  '@timestamp'?: string;
  case?: { id?: string };
  attachment?: {
    attachment_id?: string | string[];
    alert?: { indices?: string | string[] };
  };
}

export interface AlertCasePair {
  alertId: string;
  caseId: string;
  /**
   * The earliest attach time of the alert in the case
   */
  attachedAt: string;
}

type PeriodDurations =
  | { type: 'durations'; durations: number[] }
  | { type: 'error'; message: string };

/**
 * Returns true for the predefined metrics that this module calculates.
 */
export const isAlertTimeToAcknowledgeMetric = (predefinedId: string): boolean =>
  AGGREGATION_BY_METRIC_ID[predefinedId] != null;

/**
 * Builds the search of the alert attachments of one period, with the forced filters as separate clauses.
 */
export const buildAlertAttachmentSearch = (context: KpiQueryContext): KpiSearchRequest => ({
  index: 'attachments',
  body: {
    size: MAX_KPI_ALERTS,
    track_total_hits: true,
    _source: ['@timestamp', 'case.id', 'attachment.attachment_id', 'attachment.alert.indices'],
    query: {
      bool: {
        filter: [
          ...buildForcedFilters('attachments', context),
          { terms: { 'attachment.type': [...ALERT_ATTACHMENT_TYPES] } },
        ],
      },
    },
  },
});

const toArray = (value: string | string[] | undefined): string[] => {
  if (value == null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
};

/**
 * Expands the attachment documents into one pair for each alert and case, with the earliest attach time.
 * Also returns the union of the alert indices.
 */
export const extractAlertCasePairs = (
  hits: ReadonlyArray<estypes.SearchHit<AlertAttachmentSource>>
): { pairs: AlertCasePair[]; indices: string[] } => {
  const pairs = new Map<string, AlertCasePair>();
  const indices = new Set<string>();

  for (const { _source: source } of hits) {
    const caseId = source?.case?.id;
    const attachedAt = source?.['@timestamp'];

    if (caseId != null && attachedAt != null) {
      toArray(source?.attachment?.alert?.indices).forEach((index) => indices.add(index));

      for (const alertId of toArray(source?.attachment?.attachment_id)) {
        const key = JSON.stringify([alertId, caseId]);
        const existing = pairs.get(key);

        if (existing == null || Date.parse(attachedAt) < Date.parse(existing.attachedAt)) {
          pairs.set(key, { alertId, caseId, attachedAt });
        }
      }
    }
  }

  return { pairs: Array.from(pairs.values()), indices: Array.from(indices) };
};

/**
 * Returns the time when the alert was generated: the alert start, or the timestamp when the start is missing.
 */
export const getAlertGeneratedAt = ({
  start,
  timestamp,
}: AlertGeneratedTimes): string | undefined => start ?? timestamp;

/**
 * Returns the time when the alert was acknowledged in the case.
 */
export const getAlertAcknowledgedAt = ({ attachedAt }: Pick<AlertCasePair, 'attachedAt'>): string =>
  attachedAt;

/**
 * Returns the duration in seconds, or undefined when the alert is missing or the duration is invalid or negative.
 */
export const getAlertDurationSeconds = (
  pair: AlertCasePair,
  alert: AlertGeneratedTimes | undefined
): number | undefined => {
  const generatedAt = alert != null ? getAlertGeneratedAt(alert) : undefined;

  if (generatedAt == null) {
    return;
  }

  const seconds = (Date.parse(getAlertAcknowledgedAt(pair)) - Date.parse(generatedAt)) / 1000;

  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
};

/**
 * Returns the average or the exact median of the durations, or null when there are no durations.
 */
export const aggregateAlertDurations = (
  durations: readonly number[],
  aggregation: AlertDurationAggregation
): number | null => {
  if (durations.length === 0) {
    return null;
  }

  if (aggregation === 'avg') {
    return durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
  }

  const sorted = [...durations].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

const readTotalHits = ({ hits: { total } }: estypes.MsearchMultiSearchItem): number =>
  typeof total === 'number' ? total : total?.value ?? 0;

const readPeriodDurations = async (
  response: estypes.MsearchResponseItem | undefined,
  alertsService: AlertService
): Promise<PeriodDurations> => {
  if (response == null || 'error' in response) {
    return { type: 'error', message: FAILED_MESSAGE };
  }

  if (isIncompleteKpiSearchResponse(response)) {
    return { type: 'error', message: INCOMPLETE_MESSAGE };
  }

  if (readTotalHits(response) > MAX_KPI_ALERTS) {
    return { type: 'error', message: LIMIT_MESSAGE };
  }

  const { pairs, indices } = extractAlertCasePairs(
    response.hits.hits as Array<estypes.SearchHit<AlertAttachmentSource>>
  );
  const ids = Array.from(new Set(pairs.map(({ alertId }) => alertId)));

  if (ids.length > MAX_KPI_ALERTS) {
    return { type: 'error', message: LIMIT_MESSAGE };
  }

  try {
    const result = await alertsService.getAlertGeneratedTimes({ ids, indices });

    if (!result.readable) {
      return { type: 'error', message: UNREADABLE_MESSAGE };
    }

    const durations = pairs.flatMap((pair) => {
      const duration = getAlertDurationSeconds(pair, result.alerts.get(pair.alertId));
      return duration != null ? [duration] : [];
    });

    return { type: 'durations', durations };
  } catch (error) {
    return { type: 'error', message: FAILED_MESSAGE };
  }
};

/**
 * Calculates the alert time to acknowledge metrics. The attachments come from the analytics reader,
 * and the alert times come from the alerts service, which reads as the current user.
 * When the range has a start, each metric also gets the value of the previous period.
 */
export const runAlertTimeToAcknowledgeMetrics = async ({
  metrics,
  context,
  reader,
  alertsService,
}: {
  metrics: PredefinedKpiMetricConfiguration[];
  context: KpiQueryContext;
  reader: CasesAnalyticsV2ReaderContract;
  alertsService: AlertService;
}): Promise<KpiMetricResult[]> => {
  if (metrics.length === 0) {
    return [];
  }

  const previousPeriod = getPreviousPeriod(context);
  let responses: estypes.MsearchResponseItem[];

  try {
    responses = await reader.msearch([
      buildAlertAttachmentSearch(context),
      ...(previousPeriod != null
        ? [buildAlertAttachmentSearch({ ...context, ...previousPeriod })]
        : []),
    ]);
  } catch (error) {
    return metrics.map(({ id }) => toKpiMetricError(id, FAILED_MESSAGE));
  }

  const [current, previous] = await Promise.all([
    readPeriodDurations(responses[0], alertsService),
    previousPeriod != null ? readPeriodDurations(responses[1], alertsService) : undefined,
  ]);

  return metrics.map(({ id, predefinedId }) => {
    if (current.type === 'error') {
      return toKpiMetricError(id, current.message);
    }

    const aggregation = AGGREGATION_BY_METRIC_ID[predefinedId] ?? 'avg';

    return {
      id,
      type: 'value',
      format: 'duration',
      value: aggregateAlertDurations(current.durations, aggregation),
      ...(previous != null && {
        previousValue:
          previous.type === 'durations'
            ? aggregateAlertDurations(previous.durations, aggregation)
            : null,
      }),
    };
  });
};
