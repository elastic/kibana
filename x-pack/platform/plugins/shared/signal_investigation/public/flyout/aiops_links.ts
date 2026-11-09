/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEPENDENCY_OVERVIEW_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import type { MlLocatorParams } from '@kbn/ml-common-types/locator';
import { ML_APP_LOCATOR } from '@kbn/ml-common-types/locator_app_locator';
import { ML_PAGES } from '@kbn/ml-common-types/locator_ml_pages';
import { buildEsQuery, buildPhraseFilter, type Filter, type Query } from '@kbn/es-query';
import { type InvestigationSeed, isEsqlQuery } from '@kbn/investigation-seed';
import { LOGS_LOCATOR_ID } from '@kbn/logs-shared-plugin/common';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { InvestigationLead } from '@kbn/signal-investigation-contract';
import type { SerializableRecord } from '@kbn/utility-types';

const ASSET_DETAILS_LOCATOR_ID = 'ASSET_DETAILS_LOCATOR';
const SERVICE_OVERVIEW_LOCATOR_ID = 'serviceOverviewLocator';

export interface AnalysisToolLink {
  technique: string;
  label: string;
  href?: string;
}

const getRedirectUrl = (
  share: SharePluginStart | undefined,
  locatorId: string,
  params: SerializableRecord
): string | undefined => {
  const locator = share?.url.locators.get<SerializableRecord>(locatorId);
  return locator ? locator.getRedirectUrl(params) : undefined;
};

const mlRedirectUrl = (
  share: SharePluginStart | undefined,
  params: MlLocatorParams
): string | undefined => getRedirectUrl(share, ML_APP_LOCATOR, params);

const isNumericMetricOperation = (operationType: string | undefined): boolean =>
  operationType === 'avg' ||
  operationType === 'max' ||
  operationType === 'min' ||
  operationType === 'sum' ||
  operationType === 'median';

const changePointDetectionParams = (
  seed: InvestigationSeed,
  prefillMetric: boolean
): MlLocatorParams => {
  const timeRange = { from: seed.timeRange.from, to: seed.timeRange.to };
  if (
    prefillMetric &&
    seed.dataViewId &&
    seed.metric?.field &&
    isNumericMetricOperation(seed.metric.operationType)
  ) {
    return {
      page: ML_PAGES.AIOPS_CHANGE_POINT_DETECTION,
      pageState: {
        index: seed.dataViewId,
        timeRange,
        fieldConfigs: [
          {
            fn: seed.metric.operationType,
            metricField: seed.metric.field,
            ...(seed.splitField ? { splitField: seed.splitField } : {}),
          },
        ],
      },
    };
  }
  return {
    page: ML_PAGES.AIOPS_CHANGE_POINT_DETECTION_INDEX_SELECT,
    pageState: {
      ...(seed.dataViewId ? { index: seed.dataViewId } : {}),
      globalState: { time: timeRange },
    },
  };
};

const logCategorizationParams = (seed: InvestigationSeed): MlLocatorParams => {
  const timeRange = { from: seed.timeRange.from, to: seed.timeRange.to };
  return {
    page: seed.dataViewId
      ? ML_PAGES.AIOPS_LOG_CATEGORIZATION
      : ML_PAGES.AIOPS_LOG_CATEGORIZATION_INDEX_SELECT,
    pageState: {
      ...(seed.dataViewId ? { index: seed.dataViewId } : {}),
      globalState: { time: timeRange },
    },
  };
};

const logRateAnalysisParams = (seed: InvestigationSeed): MlLocatorParams => {
  const timeRange = { from: seed.timeRange.from, to: seed.timeRange.to };
  const dataViewId = seed.query && isEsqlQuery(seed.query) ? undefined : seed.dataViewId;
  return {
    page: dataViewId
      ? ML_PAGES.AIOPS_LOG_RATE_ANALYSIS
      : ML_PAGES.AIOPS_LOG_RATE_ANALYSIS_INDEX_SELECT,
    pageState: {
      ...(dataViewId ? { index: dataViewId } : {}),
      globalState: { time: timeRange },
    },
  };
};

const changePointTechnique = (): string =>
  i18n.translate('xpack.signalInvestigation.links.technique.changePointDetection', {
    defaultMessage: 'Change point detection',
  });

const logRateTechnique = (): string =>
  i18n.translate('xpack.signalInvestigation.links.technique.logRateAnalysis', {
    defaultMessage: 'Log rate analysis',
  });

const anomalyTechnique = (): string =>
  i18n.translate('xpack.signalInvestigation.links.technique.anomalyDetection', {
    defaultMessage: 'Anomaly detection',
  });

const analysisToolLink = ({
  analyzerId,
  seed,
  share,
}: {
  analyzerId: string;
  seed: InvestigationSeed;
  share?: SharePluginStart;
}): AnalysisToolLink => {
  switch (analyzerId) {
    case 'service_change_points':
    case 'dependency_change_points':
      return {
        technique: changePointTechnique(),
        label: i18n.translate('xpack.signalInvestigation.links.relatedChangePointDetection', {
          defaultMessage: 'Open Change Point Detection (related tool)',
        }),
        href: mlRedirectUrl(share, changePointDetectionParams(seed, false)),
      };
    case 'metric_change_points':
      return {
        technique: changePointTechnique(),
        label: i18n.translate('xpack.signalInvestigation.links.openChangePointDetection', {
          defaultMessage: 'Open Change Point Detection',
        }),
        href: mlRedirectUrl(share, changePointDetectionParams(seed, true)),
      };
    case 'log_change_points':
      return {
        technique: changePointTechnique(),
        label: i18n.translate('xpack.signalInvestigation.links.relatedLogPatternAnalysis', {
          defaultMessage: 'Open Log Pattern Analysis (related tool)',
        }),
        href: mlRedirectUrl(share, logCategorizationParams(seed)),
      };
    case 'log_rate_analysis':
      return {
        technique: logRateTechnique(),
        label: i18n.translate('xpack.signalInvestigation.links.openLogRateAnalysis', {
          defaultMessage: 'Open Log Rate Analysis',
        }),
        href: mlRedirectUrl(share, logRateAnalysisParams(seed)),
      };
    case 'service_anomalies':
      return {
        technique: anomalyTechnique(),
        label: i18n.translate('xpack.signalInvestigation.links.openAnomalyExplorer', {
          defaultMessage: 'Open Anomaly Explorer',
        }),
        href: mlRedirectUrl(share, {
          page: ML_PAGES.ANOMALY_EXPLORER,
          pageState: {
            timeRange: { from: seed.timeRange.from, to: seed.timeRange.to },
          },
        }),
      };
    default:
      return {
        technique: changePointTechnique(),
        label: i18n.translate('xpack.signalInvestigation.links.openFullAnalysis', {
          defaultMessage: 'Open full analysis',
        }),
      };
  }
};

/** Builds the technique name and, when the user can open AIOps, the dedicated AIOps or ML page link. */
export const buildAnalysisToolLink = ({
  analyzerId,
  seed,
  share,
  canUseAiops,
  status,
  basePath,
}: {
  analyzerId: string;
  seed: InvestigationSeed;
  share?: SharePluginStart;
  canUseAiops: boolean;
  status?: string;
  basePath?: string;
}): AnalysisToolLink => {
  if (analyzerId === 'service_anomalies' && status === 'not_set_up') {
    return {
      technique: anomalyTechnique(),
      label: i18n.translate('xpack.signalInvestigation.links.openAnomalyDetectionSettings', {
        defaultMessage: 'Open Anomaly Detection settings',
      }),
      href: `${basePath ?? ''}/app/apm/settings/anomaly-detection`,
    };
  }
  const link = analysisToolLink({ analyzerId, seed, share });
  return canUseAiops ? link : { technique: link.technique, label: link.label };
};

const phraseFilter = (
  field: string,
  value: string,
  dataViewId?: string,
  indexPattern?: string
): Filter => {
  const filter = buildPhraseFilter({ name: field, type: 'string' }, value, {
    id: dataViewId,
    title: indexPattern ?? '',
  });
  filter.meta.key = field;
  filter.meta.params = { query: value };
  filter.meta.type = 'phrase';
  return filter;
};

const phraseFilters = (
  params: Readonly<Record<string, string | number>>,
  dataViewId?: string,
  indexPattern?: string
): Filter[] => {
  const filters: Filter[] = [];
  for (let index = 0; index < 5; index++) {
    const field = params[`entity.${index}.field`];
    const value = params[`entity.${index}.value`];
    if (typeof field === 'string' && typeof value === 'string') {
      filters.push(phraseFilter(field, value, dataViewId, indexPattern));
    }
  }
  if (typeof params.leadField === 'string' && typeof params.leadValue === 'string') {
    filters.push(phraseFilter(params.leadField, params.leadValue, dataViewId, indexPattern));
  }
  return filters;
};

export interface LogRateLeadScope {
  rangeFrom: string;
  rangeTo: string;
  dataViewId?: string;
  indexPattern?: string;
  timeField: string;
  leadField?: string;
  leadValue?: string;
  query?: Query;
  filters: Filter[];
}

/** Extracts the shared time window, data view or index pattern, query, and phrase filters for a log rate lead. */
export const buildLogRateLeadScope = ({
  lead,
  seed,
}: {
  lead: InvestigationLead;
  seed: InvestigationSeed;
}): LogRateLeadScope => {
  const params = lead.locatorParams ?? {};
  const rangeFrom = String(params.rangeFrom ?? seed.timeRange.from);
  const rangeTo = String(params.rangeTo ?? seed.timeRange.to);
  const isEsql = Boolean(seed.query && isEsqlQuery(seed.query));
  const dataViewId = isEsql
    ? undefined
    : typeof params.dataViewId === 'string'
    ? params.dataViewId
    : seed.dataViewId;
  const indexPattern = typeof params.indexPattern === 'string' ? params.indexPattern : undefined;
  const timeField = typeof params.timeField === 'string' ? params.timeField : '@timestamp';
  const leadField =
    typeof params.leadField === 'string' && params.leadField.length > 0
      ? params.leadField
      : undefined;
  const leadValue =
    typeof params.leadValue === 'string' && params.leadValue.length > 0
      ? params.leadValue
      : undefined;
  const query = seed.query && !isEsqlQuery(seed.query) ? seed.query : undefined;

  return {
    rangeFrom,
    rangeTo,
    ...(dataViewId ? { dataViewId } : {}),
    ...(indexPattern ? { indexPattern } : {}),
    timeField,
    ...(leadField ? { leadField } : {}),
    ...(leadValue ? { leadValue } : {}),
    ...(query ? { query } : {}),
    filters: [...seed.filters, ...phraseFilters(params, dataViewId, indexPattern)],
  };
};

/** Builds the Elasticsearch bool query for a log rate field lead's preview sample search. */
export const buildLogRatePreviewQuery = (
  scope: LogRateLeadScope,
  resolvedTimeField: string = scope.timeField
): Record<string, unknown> => {
  const { bool } = buildEsQuery(undefined, scope.query ? [scope.query] : [], scope.filters);
  const timeRangeClause = {
    range: {
      [resolvedTimeField]: {
        gte: scope.rangeFrom,
        lte: scope.rangeTo,
      },
    },
  };
  return {
    bool: {
      ...(bool.must.length > 0 ? { must: bool.must } : {}),
      filter: [...bool.filter, timeRangeClause],
      ...(bool.should.length > 0 ? { should: bool.should } : {}),
      ...(bool.must_not.length > 0 ? { must_not: bool.must_not } : {}),
    },
  };
};

/** Returns the localized action label for a lead's primary deep-link button. */
export const buildLeadDrilldownLabel = (analyzerId: string): string => {
  switch (analyzerId) {
    case 'log_rate_analysis':
    case 'log_change_points':
      return i18n.translate('xpack.signalInvestigation.links.openInDiscoverLabel', {
        defaultMessage: 'Open in Discover',
      });
    case 'metric_change_points':
      return i18n.translate('xpack.signalInvestigation.links.openHostDetailsLabel', {
        defaultMessage: 'Open host details',
      });
    default:
      return i18n.translate('xpack.signalInvestigation.links.openInApmLabel', {
        defaultMessage: 'Open in APM',
      });
  }
};

/** Builds the primary drill-down href for a lead card using the registered Observability or Logs locator. */
export const buildLeadDrilldownHref = ({
  lead,
  seed,
  share,
}: {
  lead: InvestigationLead;
  seed: InvestigationSeed;
  share?: SharePluginStart;
}): string | undefined => {
  const params = lead.locatorParams ?? {};
  const rangeFrom = String(params.rangeFrom ?? seed.timeRange.from);
  const rangeTo = String(params.rangeTo ?? seed.timeRange.to);

  if (lead.analyzerId === 'service_change_points') {
    const serviceName = String(params.serviceName ?? seed.entities['service.name'] ?? '');
    if (!serviceName) {
      return undefined;
    }
    const environment = params.environment ?? seed.entities['service.environment'];
    return getRedirectUrl(share, SERVICE_OVERVIEW_LOCATOR_ID, {
      serviceName,
      ...(environment ? { environment: String(environment) } : {}),
      rangeFrom,
      rangeTo,
    });
  }

  if (lead.analyzerId === 'dependency_change_points') {
    const dependencyName = String(params.dependencyName ?? '');
    if (!dependencyName) {
      return undefined;
    }
    const environment = params.environment ?? seed.entities['service.environment'];
    return getRedirectUrl(share, DEPENDENCY_OVERVIEW_LOCATOR_ID, {
      dependencyName,
      ...(environment ? { environment: String(environment) } : {}),
      rangeFrom,
      rangeTo,
    });
  }

  if (lead.analyzerId === 'service_anomalies') {
    const serviceName = String(params.serviceName ?? seed.entities['service.name'] ?? '');
    if (!serviceName) {
      return undefined;
    }
    const jobId = typeof params.jobId === 'string' && params.jobId ? params.jobId : undefined;
    const transactionType =
      typeof params.transactionType === 'string' && params.transactionType
        ? params.transactionType
        : undefined;
    const detectorIndex =
      typeof params.detectorIndex === 'number' ? params.detectorIndex : undefined;
    return mlRedirectUrl(share, {
      page: ML_PAGES.SINGLE_METRIC_VIEWER,
      pageState: {
        ...(jobId ? { jobIds: [jobId] } : {}),
        timeRange: { from: rangeFrom, to: rangeTo },
        ...(detectorIndex !== undefined ? { detectorIndex } : {}),
        entities: {
          'service.name': serviceName,
          ...(transactionType ? { 'transaction.type': transactionType } : {}),
        },
      },
    });
  }

  if (lead.analyzerId === 'metric_change_points') {
    const hostName = String(params.hostName ?? seed.entities['host.name'] ?? '');
    if (!hostName) {
      return undefined;
    }
    return getRedirectUrl(share, ASSET_DETAILS_LOCATOR_ID, {
      entityType: 'host',
      entityId: hostName,
      assetDetails: {
        dateRange: {
          from: rangeFrom,
          to: rangeTo,
        },
      },
    });
  }

  if (lead.analyzerId === 'log_change_points') {
    const kql = typeof params.kql === 'string' ? params.kql : '';
    const dataViewId = typeof params.dataViewId === 'string' ? params.dataViewId : seed.dataViewId;
    return getRedirectUrl(share, LOGS_LOCATOR_ID, {
      timeRange: { from: rangeFrom, to: rangeTo },
      tab: { id: 'new' },
      ...(dataViewId ? { dataViewId } : {}),
      ...(kql ? { query: { language: 'kuery', query: kql } } : {}),
    });
  }

  if (lead.analyzerId === 'log_rate_analysis') {
    const scope = buildLogRateLeadScope({ lead, seed });
    return getRedirectUrl(share, LOGS_LOCATOR_ID, {
      timeRange: { from: scope.rangeFrom, to: scope.rangeTo },
      tab: { id: 'new' },
      ...(scope.dataViewId ? { dataViewId: scope.dataViewId } : {}),
      ...(!scope.dataViewId && scope.indexPattern
        ? { dataViewSpec: { title: scope.indexPattern, timeFieldName: scope.timeField } }
        : {}),
      ...(scope.query ? { query: scope.query } : {}),
      filters: scope.filters,
    });
  }

  return undefined;
};
