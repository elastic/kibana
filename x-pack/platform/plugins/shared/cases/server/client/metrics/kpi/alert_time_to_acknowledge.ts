/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { MAX_KPI_ACKNOWLEDGE_EVENTS, MAX_KPI_ALERTS } from '../../../../common/constants';
import type { KpiMetricResult } from '../../../../common/types/api';
import type {
  KpiAcknowledgeTrigger,
  KpiDateBasis,
  PredefinedKpiMetricConfiguration,
} from '../../../../common/types/domain';
import { AttachmentType } from '../../../../common/types/domain';
import { UNIFIED_ALERT_TYPES_ARRAY } from '../../../../common/utils/attachments';
import type { CasesAnalyticsV2ReaderContract } from '../../../cases_analytics_v2/reader';
import type { AlertGeneratedTimes, AlertService } from '../../../services/alerts';
import type { KpiPeriod } from './period';
import { getPreviousPeriod } from './period';
import type { CaseSelection } from './case_selection';
import { buildCaseSelectionSearch, readCaseSelection } from './case_selection';
import type { KpiQueryContext, KpiSearchRequest } from './query_builder';
import { buildForcedFilters } from './query_builder';
import { isIncompleteKpiSearchResponse, toKpiMetricError } from './result';
import { getKpiMetricQueryError } from './validation';

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
  action?: { type?: string };
}

export interface AcknowledgeEvent {
  time: string;
  type: 'status' | 'assignees';
}

const DEFAULT_TRIGGER: KpiAcknowledgeTrigger = 'assigned_or_in_progress';

const EVENT_TYPES_BY_TRIGGER: Record<KpiAcknowledgeTrigger, readonly AcknowledgeEvent['type'][]> = {
  assigned: ['assignees'],
  in_progress: ['status'],
  assigned_or_in_progress: ['status', 'assignees'],
};

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

type PeriodData =
  | {
      type: 'data';
      pairs: AlertCasePair[];
      alerts: Map<string, AlertGeneratedTimes>;
      events: Map<string, AcknowledgeEvent[]>;
    }
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
 * Groups the events by case id, in ascending order of time. The event type is the action type of the document.
 */
export const extractAcknowledgeEvents = (
  hits: ReadonlyArray<estypes.SearchHit<AcknowledgeEventSource>>
): Map<string, AcknowledgeEvent[]> => {
  const events = new Map<string, AcknowledgeEvent[]>();

  for (const { _source: source } of hits) {
    const caseId = source?.case?.id;
    const time = source?.['@timestamp'];
    const type = source?.action?.type;

    if (caseId != null && time != null && (type === 'status' || type === 'assignees')) {
      events.set(caseId, [...(events.get(caseId) ?? []), { time, type }]);
    }
  }

  events.forEach((list) =>
    list.sort((first, second) => Date.parse(first.time) - Date.parse(second.time))
  );

  return events;
};

/**
 * Returns the time when the alert was acknowledged in the case: the first event of the trigger at or after
 * the attach time. Returns undefined when no such event exists.
 */
export const getAlertAcknowledgedAt = ({
  attachedAt,
  events,
  trigger = DEFAULT_TRIGGER,
}: Pick<AlertCasePair, 'attachedAt'> & {
  events: readonly AcknowledgeEvent[];
  trigger?: KpiAcknowledgeTrigger;
}): string | undefined => {
  const attached = Date.parse(attachedAt);
  const types = EVENT_TYPES_BY_TRIGGER[trigger];

  return events.find(({ time, type }) => types.includes(type) && Date.parse(time) >= attached)
    ?.time;
};

/**
 * Returns the duration in seconds, or undefined when the alert is missing, no event acknowledged it,
 * or the duration is invalid or negative.
 */
export const getAlertDurationSeconds = (
  pair: AlertCasePair,
  alert: AlertGeneratedTimes | undefined,
  events: readonly AcknowledgeEvent[],
  trigger?: KpiAcknowledgeTrigger
): number | undefined => {
  const generatedAt = alert != null ? getAlertGeneratedAt(alert) : undefined;
  const acknowledgedAt = getAlertAcknowledgedAt({ attachedAt: pair.attachedAt, events, trigger });

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

export interface CaseDuration {
  caseId: string;
  duration: number;
}

/**
 * Aggregates the durations of each case into one case value, then aggregates the case values.
 * A case with no duration gives no case value.
 */
export const aggregateDurationsByCase = (
  durations: readonly CaseDuration[],
  aggregation: AlertDurationAggregation
): number | null => {
  const byCase = new Map<string, number[]>();

  durations.forEach(({ caseId, duration }) => {
    byCase.set(caseId, [...(byCase.get(caseId) ?? []), duration]);
  });

  const caseValues = Array.from(byCase.values()).flatMap((values) => {
    const value = aggregateAlertDurations(values, aggregation);
    return value != null ? [value] : [];
  });

  return aggregateAlertDurations(caseValues, aggregation);
};

const readTotalHits = ({ hits: { total } }: estypes.MsearchMultiSearchItem): number =>
  typeof total === 'number' ? total : total?.value ?? 0;

const readAcknowledgeEvents = async (
  pairs: readonly AlertCasePair[],
  context: KpiQueryContext,
  reader: CasesAnalyticsV2ReaderContract
): Promise<{ events: Map<string, AcknowledgeEvent[]> } | { message: string }> => {
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

const getPeriodDurations = (
  { pairs, alerts, events }: Extract<PeriodData, { type: 'data' }>,
  trigger?: KpiAcknowledgeTrigger
): CaseDuration[] =>
  pairs.flatMap((pair) => {
    const duration = getAlertDurationSeconds(
      pair,
      alerts.get(pair.alertId),
      events.get(pair.caseId) ?? [],
      trigger
    );

    return duration != null ? [{ caseId: pair.caseId, duration }] : [];
  });

const getPeriodValue = (
  data: Extract<PeriodData, { type: 'data' }>,
  { acknowledgeTrigger, aggregateBy }: PredefinedKpiMetricConfiguration,
  aggregation: AlertDurationAggregation
): number | null => {
  const durations = getPeriodDurations(data, acknowledgeTrigger);

  return aggregateBy === 'case'
    ? aggregateDurationsByCase(durations, aggregation)
    : aggregateAlertDurations(
        durations.map(({ duration }) => duration),
        aggregation
      );
};

const readPeriodData = async (
  response: estypes.MsearchResponseItem | undefined,
  context: KpiQueryContext,
  reader: CasesAnalyticsV2ReaderContract,
  alertsService: AlertService
): Promise<PeriodData> => {
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

    return { type: 'data', pairs, alerts: result.alerts, events: acknowledge.events };
  } catch (error) {
    return { type: 'error', message: FAILED_MESSAGE };
  }
};

interface PeriodsReadArgs {
  basis?: KpiDateBasis;
  caseQuery?: string;
  context: KpiQueryContext;
  previousPeriod?: KpiPeriod;
  reader: CasesAnalyticsV2ReaderContract;
  alertsService: AlertService;
}

interface Periods {
  current: PeriodData;
  previous?: PeriodData;
}

const FAILED_PERIODS: Periods = { current: { type: 'error', message: FAILED_MESSAGE } };

const EMPTY_PERIOD: PeriodData = {
  type: 'data',
  pairs: [],
  alerts: new Map(),
  events: new Map(),
};

/**
 * Reads the alert data of the periods. The date range applies to the attach time of the alert.
 */
const readAttachedAtPeriods = async ({
  context,
  previousPeriod,
  reader,
  alertsService,
}: PeriodsReadArgs): Promise<Periods> => {
  let responses: estypes.MsearchResponseItem[];

  try {
    responses = await reader.msearch([
      buildAlertAttachmentSearch(context),
      ...(previousPeriod != null
        ? [buildAlertAttachmentSearch({ ...context, ...previousPeriod })]
        : []),
    ]);
  } catch (error) {
    return FAILED_PERIODS;
  }

  const [current, previous] = await Promise.all([
    readPeriodData(responses[0], context, reader, alertsService),
    previousPeriod != null
      ? readPeriodData(responses[1], { ...context, ...previousPeriod }, reader, alertsService)
      : undefined,
  ]);

  return { current, previous };
};

/**
 * Reads the alert data of the periods when the engine first selects the cases. With the close date basis,
 * the selected cases closed in the range, and the attachment search has no date range. With the attach date basis
 * and a case query, the attachment search keeps the date range. In both cases it uses the selected case ids.
 */
const readSelectedCasePeriods = async ({
  basis,
  caseQuery,
  context,
  previousPeriod,
  reader,
  alertsService,
}: PeriodsReadArgs): Promise<Periods> => {
  const periodContexts = [
    context,
    ...(previousPeriod != null ? [{ ...context, ...previousPeriod }] : []),
  ];
  let selections: CaseSelection[];

  try {
    const responses = await reader.msearch(
      periodContexts.map((periodContext) =>
        buildCaseSelectionSearch(periodContext, { basis, caseQuery })
      )
    );
    selections = periodContexts.map((_, position) => readCaseSelection(responses[position]));
  } catch (error) {
    return FAILED_PERIODS;
  }

  const searchedPositions = selections.flatMap((selection, position) =>
    selection.type === 'ids' && selection.ids.length > 0 ? [position] : []
  );
  let attachmentResponses: estypes.MsearchResponseItem[] = [];

  if (searchedPositions.length > 0) {
    try {
      attachmentResponses = await reader.msearch(
        searchedPositions.map((position) => {
          const selection = selections[position];

          return buildAlertAttachmentSearch({
            ...(basis === 'case_closed_at'
              ? { spaceId: context.spaceId, owner: context.owner }
              : periodContexts[position]),
            caseIds: selection.type === 'ids' ? selection.ids : [],
          });
        })
      );
    } catch (error) {
      return FAILED_PERIODS;
    }
  }

  const [current, previous] = await Promise.all(
    periodContexts.map(async (periodContext, position): Promise<PeriodData> => {
      const selection = selections[position];

      if (selection.type === 'error') {
        return { type: 'error', message: selection.message };
      }

      return selection.ids.length === 0
        ? EMPTY_PERIOD
        : readPeriodData(
            attachmentResponses[searchedPositions.indexOf(position)],
            periodContext,
            reader,
            alertsService
          );
    })
  );

  return { current, previous };
};

/**
 * Calculates the alert time to acknowledge metrics. The attachments come from the analytics reader,
 * and the alert times come from the alerts service, which reads as the current user.
 * When the range has a start, each metric also gets the value of the previous period.
 * The metrics with the same date basis share the searches.
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
  const getGroupKey = ({ dateBasis, caseQuery }: PredefinedKpiMetricConfiguration): string =>
    JSON.stringify([dateBasis ?? 'attached_at', caseQuery?.trim() ?? '']);
  const queryErrors = new Map(
    metrics.flatMap(({ id, caseQuery }) => {
      const error = caseQuery != null ? getKpiMetricQueryError(caseQuery) : undefined;
      return error != null ? [[id, error] as const] : [];
    })
  );
  const groups = new Map(
    metrics
      .filter(({ id }) => !queryErrors.has(id))
      .map((metric) => [getGroupKey(metric), metric] as const)
  );
  const periodsByGroup = new Map<string, Periods>(
    await Promise.all(
      Array.from(groups.entries()).map(
        async ([key, { dateBasis, caseQuery }]): Promise<[string, Periods]> => {
          const args = {
            basis: dateBasis ?? 'attached_at',
            caseQuery,
            context,
            previousPeriod,
            reader,
            alertsService,
          };
          const hasCaseQuery = caseQuery != null && caseQuery.trim() !== '';

          return [
            key,
            args.basis === 'case_closed_at' || hasCaseQuery
              ? await readSelectedCasePeriods(args)
              : await readAttachedAtPeriods(args),
          ];
        }
      )
    )
  );

  return metrics.map((metric) => {
    const { id, predefinedId } = metric;
    const queryError = queryErrors.get(id);

    if (queryError != null) {
      return toKpiMetricError(id, queryError);
    }

    const { current, previous } = periodsByGroup.get(getGroupKey(metric)) ?? FAILED_PERIODS;

    if (current.type === 'error') {
      return toKpiMetricError(id, current.message);
    }

    const aggregation = AGGREGATION_BY_METRIC_ID[predefinedId] ?? 'avg';

    return {
      id,
      type: 'value',
      format: 'duration',
      value: getPeriodValue(current, metric, aggregation),
      ...(previous != null && {
        previousValue:
          previous.type === 'data' ? getPeriodValue(previous, metric, aggregation) : null,
      }),
    };
  });
};
