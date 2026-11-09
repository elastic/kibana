/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { WindowParameters } from '@kbn/aiops-log-rate-analysis';
import { getLogRateAnalysisParametersFromAlert } from '@kbn/aiops-log-rate-analysis/get_log_rate_analysis_parameters_from_alert';
import { runLogRateAnalysis } from '@kbn/aiops-log-rate-analysis/queries/fetch_log_rate_analysis_for_alert';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import datemath from '@kbn/datemath';
import { buildEsQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import {
  MAX_INVESTIGATION_FIELD_CHARS,
  type InvestigationSeed,
  isEsqlQuery,
  resolveInvestigationHosts,
} from '@kbn/investigation-seed';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/server';
import type { LogsSharedPluginStart } from '@kbn/logs-shared-plugin/server';
import { timingBand } from '@kbn/signals-server';
import type {
  AnalyzerApplicability,
  InvestigationLead,
  LeadRelationship,
  LeadSignalBand,
  SignalAnalyzer,
  SignalAnalyzerComparison,
  SignalAnalyzerPivot,
  SignalAnalyzerResult,
} from '@kbn/signal-investigation-contract';
import { truncate } from 'lodash';
import { isLogVolumeAnchor, isNonLogsIndexPattern } from '../common/log_volume_anchor';
import { compareLeads } from '../common/rank_leads';
import { extractReadOnlyEsqlIndexPattern } from './esql_index_source';
import { hashLeadIdValue } from './lead_id';
import { resolveLogIndex, unavailableDataViewResult } from './resolve_log_index';

export const LOG_RATE_ANALYSIS_ANALYZER_ID = 'log_rate_analysis';
export const MAX_LOG_RATE_LEADS = 10;
export const MAX_RELATED_FIELDS = 5;

const MIN_DEVIATION_DURATION_MS = 60_000;
const BASELINE_DURATION_MULTIPLIER = 2;
const MAX_FIELD_VALUE_CHARS = 120;

const needsLogVolumeAnchorMessage = (): string =>
  i18n.translate('xpack.signalInvestigation.logRateAnalysis.needsLogVolumeAnchor', {
    defaultMessage: 'This analysis runs on log-volume changes.',
  });

export interface LogRateSignificantItem {
  score: number;
  pValue?: number | null;
  fieldType: string;
  fieldName: string;
  fieldValue: string;
  message: string;
  change: {
    baseline: number;
    deviation: number;
  };
}

export interface LogRateAnalysisRunResult {
  logRateAnalysisType: string;
  zeroDocsFallback?: boolean;
  significantItems: readonly LogRateSignificantItem[];
}

export const logRateAnalysisApplicability = (seed: InvestigationSeed): AnalyzerApplicability => {
  if (seed.query && isEsqlQuery(seed.query)) {
    const esqlIndex = extractReadOnlyEsqlIndexPattern(seed.query.esql);
    if (!esqlIndex) {
      return {
        applicable: false,
        status: 'not_applicable',
        message: i18n.translate(
          'xpack.signalInvestigation.logRateAnalysis.esqlReadOnlyIndexMessage',
          {
            defaultMessage: 'Runs on ES|QL queries that only read from an index.',
          }
        ),
      };
    }
    if (isNonLogsIndexPattern(esqlIndex)) {
      return {
        applicable: false,
        status: 'not_applicable',
        message: needsLogVolumeAnchorMessage(),
      };
    }
  }
  if (seed.origin.app === 'discover' && seed.origin.surface === 'document') {
    return {
      applicable: false,
      status: 'not_applicable',
      message: i18n.translate('xpack.signalInvestigation.logRateAnalysis.notVolumeDocument', {
        defaultMessage: 'Single log documents are not a log-volume anchor.',
      }),
    };
  }
  if (!isLogVolumeAnchor(seed)) {
    return {
      applicable: false,
      status: 'not_applicable',
      message: needsLogVolumeAnchorMessage(),
    };
  }
  return { applicable: true };
};

const parseBoundMs = (value: string): number => datemath.parse(value)?.valueOf() ?? 0;

const selectionWindows = (seed: InvestigationSeed): WindowParameters => {
  const rawStart = seed.selection ? seed.selection.start : parseBoundMs(seed.timeRange.from);
  const rawEnd = seed.selection ? seed.selection.end : parseBoundMs(seed.timeRange.to);
  const deviationMax = rawEnd;
  const duration = Math.max(rawEnd - rawStart, MIN_DEVIATION_DURATION_MS);
  const deviationMin = rawEnd > rawStart ? rawStart : deviationMax - duration;
  const baselineMax = deviationMin;
  const baselineMin = deviationMin - BASELINE_DURATION_MULTIPLIER * duration;

  return {
    baselineMin,
    baselineMax,
    deviationMin,
    deviationMax,
  };
};

/**
 * Sizes alert windows with the AIOps alert helper. A brushed selection, or a dashboard or
 * Discover time range, keeps a deviation window of the selection and a baseline of twice that.
 */
export const logRateAnalysisWindows = (seed: InvestigationSeed): WindowParameters => {
  if (seed.selection) {
    return selectionWindows(seed);
  }
  if (seed.origin.app === 'alerts') {
    return getLogRateAnalysisParametersFromAlert({
      alertStartedAt: seed.timeRange.from,
      alertEndedAt: seed.origin.alertEnd,
      timeSize: seed.origin.lookback?.timeSize,
      timeUnit: seed.origin.lookback?.timeUnit,
    }).windowParameters;
  }
  return selectionWindows(seed);
};

interface EntityClause {
  field: string;
  value: string;
}

const entityClauses = (
  seed: InvestigationSeed
): {
  termFilters: QueryDslQueryContainer[];
  entities: EntityClause[];
  relationship: LeadRelationship;
  relevance: string;
} => {
  const serviceName = seed.entities['service.name'];
  const environment = seed.entities['service.environment'];
  const hostName = seed.entities['host.name'];
  const userName = seed.entities['user.name'];
  const sourceIp = seed.entities['source.ip'];

  if (serviceName) {
    const termFilters: QueryDslQueryContainer[] = [{ term: { 'service.name': serviceName } }];
    const entities: EntityClause[] = [{ field: 'service.name', value: serviceName }];
    if (environment) {
      termFilters.push({ term: { 'service.environment': environment } });
      entities.push({ field: 'service.environment', value: environment });
    }
    return {
      termFilters,
      entities,
      relationship: 'service',
      relevance: environment
        ? i18n.translate('xpack.signalInvestigation.logRateAnalysis.sameServiceAndEnvironment', {
            defaultMessage: 'Logs for service {serviceName} ({environment})',
            values: { serviceName, environment },
          })
        : i18n.translate('xpack.signalInvestigation.logRateAnalysis.sameService', {
            defaultMessage: 'Logs for service {serviceName}',
            values: { serviceName },
          }),
    };
  }

  if (hostName) {
    return {
      termFilters: [{ term: { 'host.name': hostName } }],
      entities: [{ field: 'host.name', value: hostName }],
      relationship: 'host',
      relevance: i18n.translate('xpack.signalInvestigation.logRateAnalysis.sameHost', {
        defaultMessage: 'Logs for host {hostName}',
        values: { hostName },
      }),
    };
  }

  if (userName) {
    return {
      termFilters: [{ term: { 'user.name': userName } }],
      entities: [{ field: 'user.name', value: userName }],
      relationship: 'user',
      relevance: i18n.translate('xpack.signalInvestigation.logRateAnalysis.sameUser', {
        defaultMessage: 'Logs for user {userName}',
        values: { userName },
      }),
    };
  }

  if (sourceIp) {
    return {
      termFilters: [{ term: { 'source.ip': sourceIp } }],
      entities: [{ field: 'source.ip', value: sourceIp }],
      relationship: 'network',
      relevance: i18n.translate('xpack.signalInvestigation.logRateAnalysis.sameSourceIp', {
        defaultMessage: 'Logs for source IP {sourceIp}',
        values: { sourceIp },
      }),
    };
  }

  return {
    termFilters: [],
    entities: [],
    relationship: 'unknown',
    relevance: i18n.translate('xpack.signalInvestigation.logRateAnalysis.selectedWindow', {
      defaultMessage: 'Logs in the selected window',
    }),
  };
};

/** Combines the seed query, filters, and known service or host terms into one search query. */
export const buildLogRateSearchQuery = (seed: InvestigationSeed): QueryDslQueryContainer => {
  const queries = seed.query && !isEsqlQuery(seed.query) ? [seed.query] : [];
  const { bool } = buildEsQuery(undefined, queries, seed.filters);
  const { termFilters } = entityClauses(seed);
  const filter = [...(bool.filter ?? []), ...termFilters];
  const must = bool.must ?? [];
  const should = bool.should ?? [];
  const mustNot = bool.must_not ?? [];

  if (filter.length === 0 && must.length === 0 && should.length === 0 && mustNot.length === 0) {
    return { match_all: {} };
  }

  return {
    bool: {
      ...(must.length > 0 ? { must } : {}),
      ...(filter.length > 0 ? { filter } : {}),
      ...(should.length > 0 ? { should } : {}),
      ...(mustNot.length > 0 ? { must_not: mustNot } : {}),
    },
  };
};

const logRateSignalBand = (pValue: number | null | undefined): LeadSignalBand => {
  if (pValue === undefined || pValue === null || Number.isNaN(pValue)) {
    return 'unknown';
  }
  if (pValue < 0.01) {
    return 'strong';
  }
  if (pValue < 0.05) {
    return 'moderate';
  }
  return 'weak';
};

const formatPValue = (pValue: number | null | undefined): string => {
  if (pValue === undefined || pValue === null || !Number.isFinite(pValue)) {
    return '< 0.05';
  }
  if (pValue < 0.0001) {
    return '< 0.0001';
  }
  return Number(pValue.toPrecision(2)).toString();
};

const truncateValue = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length <= MAX_FIELD_VALUE_CHARS) {
    return trimmed;
  }
  // Lodash counts the omission inside `length`, so keep the cut at 120 and add the ellipsis after.
  return `${truncate(trimmed, { length: MAX_FIELD_VALUE_CHARS, omission: '' })}…`;
};

const leadId = (fieldName: string, fieldValue: string, occurredAt: string): string =>
  [LOG_RATE_ANALYSIS_ANALYZER_ID, fieldName, hashLeadIdValue(fieldValue), occurredAt].join(':');

const entityLocatorParams = (entities: readonly EntityClause[]): Record<string, string> => {
  const params: Record<string, string> = {};
  entities.forEach((entity, index) => {
    params[`entity.${index}.field`] = entity.field;
    params[`entity.${index}.value`] = entity.value;
  });
  return params;
};

export const toComparisonWindows = (
  windowParameters: WindowParameters
): SignalAnalyzerComparison => ({
  baseline: {
    from: new Date(windowParameters.baselineMin).toISOString(),
    to: new Date(windowParameters.baselineMax).toISOString(),
  },
  deviation: {
    from: new Date(windowParameters.deviationMin).toISOString(),
    to: new Date(windowParameters.deviationMax).toISOString(),
  },
});

interface TermsBucket {
  key?: unknown;
}

const extractTermsBuckets = (
  aggregations: unknown,
  aggName: 'service_names' | 'host_names'
): readonly TermsBucket[] => {
  if (typeof aggregations !== 'object' || aggregations === null) {
    return [];
  }
  const agg = (aggregations as Record<string, { buckets?: unknown }>)[aggName];
  return Array.isArray(agg?.buckets) ? (agg.buckets as readonly TermsBucket[]) : [];
};

const toValidPivotValue = (bucket: TermsBucket | undefined): string | undefined => {
  if (!bucket || (typeof bucket.key !== 'string' && typeof bucket.key !== 'number')) {
    return undefined;
  }
  const value = String(bucket.key).trim();
  if (value.length === 0 || value.length > MAX_INVESTIGATION_FIELD_CHARS) {
    return undefined;
  }
  return value;
};

const isAbortError = (error: unknown, abortSignal: AbortSignal): boolean => {
  if (abortSignal.aborted) {
    return true;
  }
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.name === 'RequestAbortedError';
  }
  return false;
};

/**
 * Checks whether the deviation window contains a single `service.name` (or zero services and a
 * single `host.name`) when the seed has no service or resolved host.
 */
export const lookupDeviationEntityPivot = async ({
  esClient,
  seed,
  index,
  timeField,
  windowParameters,
  searchQuery,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  seed: InvestigationSeed;
  index: string;
  timeField: string;
  windowParameters: WindowParameters;
  searchQuery: QueryDslQueryContainer;
  abortSignal: AbortSignal;
}): Promise<SignalAnalyzerPivot | undefined> => {
  if (
    seed.entities['service.name'] ||
    resolveInvestigationHosts(seed).length > 0 ||
    seed.entities['user.name'] ||
    seed.entities['source.ip']
  ) {
    return undefined;
  }

  const timeRangeClause: QueryDslQueryContainer = {
    range: {
      [timeField]: {
        gte: new Date(windowParameters.deviationMin).toISOString(),
        lte: new Date(windowParameters.deviationMax).toISOString(),
      },
    },
  };
  const query: QueryDslQueryContainer = {
    bool: {
      filter: [searchQuery, timeRangeClause],
    },
  };

  try {
    const response = await esClient.search(
      {
        index,
        size: 0,
        track_total_hits: false,
        query,
        aggs: {
          service_names: {
            terms: {
              field: 'service.name',
              size: 2,
            },
          },
          host_names: {
            terms: {
              field: 'host.name',
              size: 2,
            },
          },
        },
      },
      { signal: abortSignal }
    );

    const serviceBuckets = extractTermsBuckets(response.aggregations, 'service_names');
    if (serviceBuckets.length === 1) {
      const value = toValidPivotValue(serviceBuckets[0]);
      return value ? { field: 'service.name', value } : undefined;
    }
    if (serviceBuckets.length > 1) {
      return undefined;
    }

    const hostBuckets = extractTermsBuckets(response.aggregations, 'host_names');
    if (hostBuckets.length === 1) {
      const value = toValidPivotValue(hostBuckets[0]);
      return value ? { field: 'host.name', value } : undefined;
    }
    return undefined;
  } catch (error) {
    if (isAbortError(error, abortSignal)) {
      throw error;
    }
    return undefined;
  }
};

/** Maps a runLogRateAnalysis result to ranked leads (at most 10) and an explicit status. */
export const mapLogRateAnalysisResult = ({
  result,
  seed,
  windowParameters,
  index,
  timeField,
  pivot,
}: {
  result: LogRateAnalysisRunResult;
  seed: InvestigationSeed;
  windowParameters: WindowParameters;
  index?: string;
  timeField?: string;
  pivot?: SignalAnalyzerPivot;
}): SignalAnalyzerResult => {
  const comparison = toComparisonWindows(windowParameters);
  const pivotField = pivot ? { pivot } : {};

  const isEsql = Boolean(seed.query && isEsqlQuery(seed.query));
  const esqlNote = isEsql
    ? i18n.translate('xpack.signalInvestigation.logRateAnalysis.esqlTimestampNoteMessage', {
        defaultMessage: 'Analyzed on @timestamp.',
      })
    : undefined;

  if (result.zeroDocsFallback) {
    return {
      leads: [],
      entities: {},
      status: 'indeterminable',
      message: isEsql
        ? i18n.translate('xpack.signalInvestigation.logRateAnalysis.indeterminableEsqlMessage', {
            defaultMessage:
              'Not enough data in the baseline or deviation window. Analyzed on @timestamp.',
          })
        : i18n.translate('xpack.signalInvestigation.logRateAnalysis.indeterminable', {
            defaultMessage: 'Not enough data in the baseline or deviation window',
          }),
      comparison,
      ...pivotField,
    };
  }

  if (result.significantItems.length === 0) {
    return {
      leads: [],
      entities: {},
      status: 'no_change',
      ...(esqlNote ? { message: esqlNote } : {}),
      comparison,
      ...pivotField,
    };
  }

  const { entities, relationship, relevance } = entityClauses(seed);
  const occurredAt = comparison.deviation.from;
  const rangeFrom = occurredAt;
  const rangeTo = comparison.deviation.to;

  interface LeadCandidate {
    lead: InvestigationLead;
    fieldName: string;
    isFieldLead: boolean;
    dedupeKey: string;
  }

  const candidates: LeadCandidate[] = result.significantItems.map((item) => {
    const fieldValue = truncateValue(item.fieldValue);
    const isFieldLead = item.fieldType !== 'log message pattern';
    const normalizedPValue =
      item.pValue !== undefined && item.pValue !== null && Number.isFinite(item.pValue)
        ? String(item.pValue)
        : 'null';
    const dedupeKey = JSON.stringify([
      item.fieldValue.trim(),
      rangeFrom,
      rangeTo,
      item.change.baseline,
      item.change.deviation,
      normalizedPValue,
    ]);

    return {
      fieldName: item.fieldName.trim().slice(0, MAX_INVESTIGATION_FIELD_CHARS),
      isFieldLead,
      dedupeKey,
      lead: {
        id: leadId(item.fieldName, item.fieldValue, occurredAt),
        analyzerId: LOG_RATE_ANALYSIS_ANALYZER_ID,
        summary: i18n.translate('xpack.signalInvestigation.logRateAnalysis.summary', {
          defaultMessage:
            '{fieldName}: "{fieldValue}" (normalized rate {baseline} in baseline to {deviation} in deviation, p = {pValue})',
          values: {
            fieldName: item.fieldName,
            fieldValue,
            baseline: item.change.baseline,
            deviation: item.change.deviation,
            pValue: formatPValue(item.pValue),
          },
        }),
        occurredAt,
        relevance,
        ranking: {
          signal: logRateSignalBand(item.pValue),
          timing: timingBand(occurredAt, seed.timeRange.from, seed.timeRange.to),
          relationship,
        },
        shift: {
          baseline: item.change.baseline,
          deviation: item.change.deviation,
          kind: 'document_rate',
        },
        locatorParams: {
          ...entityLocatorParams(entities),
          ...(isFieldLead ? { leadField: item.fieldName, leadValue: item.fieldValue } : {}),
          rangeFrom,
          rangeTo,
          ...(!isEsql && seed.dataViewId ? { dataViewId: seed.dataViewId } : {}),
          ...(index ? { indexPattern: index } : {}),
          ...(timeField ? { timeField } : {}),
        },
      },
    };
  });

  const rankedCandidates = [...candidates].sort((a, b) => compareLeads(a.lead, b.lead));
  const groupsByKey = new Map<string, LeadCandidate[]>();
  for (const candidate of rankedCandidates) {
    const existing = groupsByKey.get(candidate.dedupeKey);
    if (existing) {
      existing.push(candidate);
    } else {
      groupsByKey.set(candidate.dedupeKey, [candidate]);
    }
  }

  const collapsedLeads: InvestigationLead[] = Array.from(groupsByKey.values()).map((group) => {
    const primary = group.find((candidate) => candidate.isFieldLead) ?? group[0];
    const relatedFields: string[] = [];
    for (const candidate of group) {
      if (candidate === primary) {
        continue;
      }
      const { fieldName } = candidate;
      if (
        fieldName.length > 0 &&
        fieldName !== primary.fieldName &&
        !relatedFields.includes(fieldName)
      ) {
        relatedFields.push(fieldName);
        if (relatedFields.length >= MAX_RELATED_FIELDS) {
          break;
        }
      }
    }
    return relatedFields.length > 0 ? { ...primary.lead, relatedFields } : primary.lead;
  });

  const leads = collapsedLeads.slice(0, MAX_LOG_RATE_LEADS);
  const truncated = collapsedLeads.length > MAX_LOG_RATE_LEADS;

  const message = truncated
    ? isEsql
      ? i18n.translate('xpack.signalInvestigation.logRateAnalysis.leadCapEsqlMessage', {
          defaultMessage: 'Showing the first {max} leads. Analyzed on @timestamp.',
          values: { max: leads.length },
        })
      : i18n.translate('xpack.signalInvestigation.logRateAnalysis.leadCap', {
          defaultMessage: 'Showing the first {max} leads.',
          values: { max: leads.length },
        })
    : esqlNote;

  return {
    leads,
    entities: {},
    status: 'found',
    message,
    comparison,
    ...pivotField,
  };
};

export const createLogRateAnalysisAnalyzer = ({
  getLogsDataAccess,
  getDataViews,
  getLogViews,
}: {
  getLogsDataAccess: () => Promise<LogsDataAccessPluginStart>;
  getDataViews: () => Promise<DataViewsServerPluginStart>;
  getLogViews: () => Promise<LogsSharedPluginStart['logViews'] | undefined>;
}): SignalAnalyzer => ({
  id: LOG_RATE_ANALYSIS_ANALYZER_ID,
  displayName: i18n.translate('xpack.signalInvestigation.logRateAnalysis.displayName', {
    defaultMessage: 'Log rate analysis',
  }),
  authz: 'es_delegated',
  getApplicability: logRateAnalysisApplicability,
  run: async (seed, deps, abortSignal) => {
    const coreContext = await deps.context.core;
    const esClient = coreContext.elasticsearch.client.asCurrentUser;
    const logsDataAccess = await getLogsDataAccess();
    const logSourcesService =
      await logsDataAccess.services.logSourcesServiceFactory.getLogSourcesService(
        coreContext.savedObjects.client
      );
    const resolved = await resolveLogIndex({
      seed,
      dataViews: await getDataViews(),
      logViews: await getLogViews(),
      savedObjectsClient: coreContext.savedObjects.client,
      esClient,
      request: deps.request,
      logSourcesService,
    });
    if (resolved.kind === 'unavailable') {
      return unavailableDataViewResult();
    }
    if (resolved.kind === 'non_logs' || isNonLogsIndexPattern(resolved.index)) {
      return {
        leads: [],
        entities: {},
        status: 'not_applicable',
        message: needsLogVolumeAnchorMessage(),
      };
    }
    const windowParameters = logRateAnalysisWindows(seed);
    const searchQuery = buildLogRateSearchQuery(seed);

    const [result, pivot] = await Promise.all([
      runLogRateAnalysis({
        esClient,
        abortSignal,
        arguments: {
          index: resolved.index,
          timefield: resolved.timeField,
          windowParameters,
          searchQuery,
        },
      }),
      lookupDeviationEntityPivot({
        esClient,
        seed,
        index: resolved.index,
        timeField: resolved.timeField,
        windowParameters,
        searchQuery,
        abortSignal,
      }),
    ]);

    return mapLogRateAnalysisResult({
      result,
      seed,
      windowParameters,
      index: resolved.index,
      timeField: resolved.timeField,
      pivot,
    });
  },
});
