/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { MAX_KPI_ACKNOWLEDGE_EVENTS, MAX_KPI_ALERTS } from '../../../../common/constants';
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
const EVENT_LIMIT_MESSAGE = `More than ${MAX_KPI_ACKNOWLEDGE_EVENTS} assignments and status changes are in this range. Select a shorter range to see this metric.`;
const UNREADABLE_MESSAGE = 'You do not have permission to read the alerts of these cases.';
const FAILED_MESSAGE = 'The metric search failed.';
const INCOMPLETE_MESSAGE = 'The metric search returned incomplete results.';

interface AcknowledgeEventSource {
  '@timestamp'?: string;
  case?: { id?: string };
}

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

/**
 * Builds the search of the events that acknowledge an alert: a move to In progress or an added assignee.
 * The date range of the period does not apply, so a late pickup is not cut off.
 */
export const buildAcknowledgeEventSearch = (
  context: Pick<KpiQueryContext, 'spaceId' | 'owner'> & { caseIds: string[] },
  since: string
): KpiSearchRequest => ({
  index: 'activity',
  body: {
    size: MAX_KPI_ACKNOWLEDGE_EVENTS,
    track_total_hits: true,
    sort: [{ '@timestamp': 'asc' }],
    _source: ['@timestamp', 'case.id', 'action.type'],
    query: {
      bool: {
        filter: [
          ...buildForcedFilters('activity', context),
          { range: { '@timestamp': { gte: since } } },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  bool: {
                    filter: [
                      { term: { 'action.type': 'status' } },
                      { term: { 'action.status_new': 'in-progress' } },
                    ],
                  },
                },
                {
                  bool: {
                    filter: [
                      { term: { 'action.type': 'assignees' } },
                      { term: { 'action.verb': 'add' } },
                    ],
                  },
                },
              ],
            },
          },
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
 * Groups the event times by case id, in ascending order.
 */
export const extractAcknowledgeEvents = (
  hits: ReadonlyArray<estypes.SearchHit<AcknowledgeEventSource>>
): Map<string, string[]> => {
  const events = new Map<string, string[]>();

  for (const { _source: source } of hits) {
    const caseId = source?.case?.id;
    const time = source?.['@timestamp'];

    if (caseId != null && time != null) {
      events.set(caseId, [...(events.get(caseId) ?? []), time]);
    }
  }

  events.forEach((times) => times.sort((first, second) => Date.parse(first) - Date.parse(second)));

  return events;
};

/**
 * Returns the time when the alert was acknowledged in the case: the first event at or after the attach time.
 * Returns undefined when no such event exists.
 */
export const getAlertAcknowledgedAt = ({
  attachedAt,
  eventTimes,
}: Pick<AlertCasePair, 'attachedAt'> & { eventTimes: readonly string[] }): string | undefined => {
  const attached = Date.parse(attachedAt);

  return eventTimes.find((time) => Date.parse(time) >= attached);
};

/**
 * Returns the duration in seconds, or undefined when the alert is missing, no event acknowledged it,
 * or the duration is invalid or negative.
 */
export const getAlertDurationSeconds = (
  pair: AlertCasePair,
  alert: AlertGeneratedTimes | undefined,
  eventTimes: readonly string[]
): number | undefined => {
  const generatedAt = alert != null ? getAlertGeneratedAt(alert) : undefined;
  const acknowledgedAt = getAlertAcknowledgedAt({ attachedAt: pair.attachedAt, eventTimes });

  if (generatedAt == null || acknowledgedAt == null) {
    return;
  }

  const seconds = (Date.parse(acknowledgedAt) - Date.parse(generatedAt)) / 1000;

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

const readAcknowledgeEvents = async (
  pairs: readonly AlertCasePair[],
  context: KpiQueryContext,
  reader: CasesAnalyticsV2ReaderContract
): Promise<{ events: Map<string, string[]> } | { message: string }> => {
  if (pairs.length === 0) {
    return { events: new Map() };
  }

  const since = pairs.reduce(
    (earliest, { attachedAt }) =>
      Date.parse(attachedAt) < Date.parse(earliest) ? attachedAt : earliest,
    pairs[0].attachedAt
  );
  const caseIds = Array.from(new Set(pairs.map(({ caseId }) => caseId)));

  try {
    const [response] = await reader.msearch([
      buildAcknowledgeEventSearch(
        { spaceId: context.spaceId, owner: context.owner, caseIds },
        since
      ),
    ]);

    if (response == null || 'error' in response) {
      return { message: FAILED_MESSAGE };
    }

    if (isIncompleteKpiSearchResponse(response)) {
      return { message: INCOMPLETE_MESSAGE };
    }

    if (readTotalHits(response) > MAX_KPI_ACKNOWLEDGE_EVENTS) {
      return { message: EVENT_LIMIT_MESSAGE };
    }

    return {
      events: extractAcknowledgeEvents(
        response.hits.hits as Array<estypes.SearchHit<AcknowledgeEventSource>>
      ),
    };
  } catch (error) {
    return { message: FAILED_MESSAGE };
  }
};

const readPeriodDurations = async (
  response: estypes.MsearchResponseItem | undefined,
  context: KpiQueryContext,
  reader: CasesAnalyticsV2ReaderContract,
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
    const [result, acknowledge] = await Promise.all([
      alertsService.getAlertGeneratedTimes({ ids, indices }),
      readAcknowledgeEvents(pairs, context, reader),
    ]);

    if (!result.readable) {
      return { type: 'error', message: UNREADABLE_MESSAGE };
    }

    if ('message' in acknowledge) {
      return { type: 'error', message: acknowledge.message };
    }

    const durations = pairs.flatMap((pair) => {
      const duration = getAlertDurationSeconds(
        pair,
        result.alerts.get(pair.alertId),
        acknowledge.events.get(pair.caseId) ?? []
      );
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
    readPeriodDurations(responses[0], context, reader, alertsService),
    previousPeriod != null
      ? readPeriodDurations(responses[1], { ...context, ...previousPeriod }, reader, alertsService)
      : undefined,
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
