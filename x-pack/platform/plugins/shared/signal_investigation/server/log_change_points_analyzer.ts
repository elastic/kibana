/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { i18n } from '@kbn/i18n';
import { escapeQuotes } from '@kbn/es-query';
import {
  type InvestigationSeed,
  isEsqlQuery,
  resolveInvestigationHosts,
} from '@kbn/investigation-seed';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/server';
import type { LogsSharedPluginStart } from '@kbn/logs-shared-plugin/server';
import {
  type ChangePoint,
  changePointSignalBand,
  changePointWindow,
  getLogChangePoint,
  timingBand,
} from '@kbn/signals-server';
import type {
  AnalyzerApplicability,
  InvestigationLead,
  LeadRelationship,
  SignalAnalyzer,
  SignalAnalyzerResult,
} from '@kbn/signal-investigation-contract';
import { truncate } from 'lodash';
import { compareLeads } from '../common/rank_leads';
import { hashLeadIdValue } from './lead_id';
import { resolveLogIndex, unavailableDataViewResult } from './resolve_log_index';

export const LOG_CHANGE_POINTS_ANALYZER_ID = 'log_change_points';

const MAX_LOG_LEADS = 25;
const MESSAGE_FIELD = 'message';
const MAX_PATTERN_CHARS = 120;

export const logChangePointsApplicability = (seed: InvestigationSeed): AnalyzerApplicability => {
  if (seed.query && isEsqlQuery(seed.query)) {
    return {
      applicable: false,
      status: 'not_applicable',
      message: i18n.translate('xpack.signalInvestigation.logChangePoints.esqlUnsupported', {
        defaultMessage: 'Log change points do not run on ES|QL queries.',
      }),
    };
  }
  if (!seed.entities['service.name'] && resolveInvestigationHosts(seed).length === 0) {
    return {
      applicable: false,
      status: 'not_applicable',
      message: i18n.translate('xpack.signalInvestigation.logChangePoints.needsEntity', {
        defaultMessage: 'This analysis needs a service or host name.',
      }),
    };
  }
  return { applicable: true };
};

const nonLogIndexResult = (): SignalAnalyzerResult => ({
  leads: [],
  entities: {},
  status: 'not_applicable',
  message: i18n.translate('xpack.signalInvestigation.logChangePoints.nonLogIndex', {
    defaultMessage: 'Log change points run on log indexes.',
  }),
});

export const buildLogEntityKql = (
  seed: InvestigationSeed
): {
  kql: string;
  subject: string;
  relationship: LeadRelationship;
  relevance: string;
} => {
  const serviceName = seed.entities['service.name'];
  const environment = seed.entities['service.environment'];
  const hosts = resolveInvestigationHosts(seed);

  if (serviceName) {
    const clauses = [`service.name : "${escapeQuotes(serviceName)}"`];
    if (environment) {
      clauses.push(`service.environment : "${escapeQuotes(environment)}"`);
    }
    return {
      kql: clauses.join(' and '),
      subject: serviceName,
      relationship: 'service',
      relevance: i18n.translate('xpack.signalInvestigation.logChangePoints.sameService', {
        defaultMessage: 'Logs for service {serviceName}',
        values: { serviceName },
      }),
    };
  }

  const hostName = hosts[0];
  if (!hostName) {
    throw new Error('This analysis requires a service or host name');
  }

  return {
    kql: hosts.map((host) => `host.name : "${escapeQuotes(host)}"`).join(' or '),
    subject: hostName,
    relationship: 'host',
    relevance: i18n.translate('xpack.signalInvestigation.logChangePoints.sameHost', {
      defaultMessage: 'Logs for host {hostName}',
      values: { hostName },
    }),
  };
};

const changeTypeLabel = (type: string): string => {
  switch (type) {
    case 'spike':
      return i18n.translate('xpack.signalInvestigation.logChangePoints.changeType.spike', {
        defaultMessage: 'spike',
      });
    case 'dip':
      return i18n.translate('xpack.signalInvestigation.logChangePoints.changeType.dip', {
        defaultMessage: 'dip',
      });
    case 'step_change':
      return i18n.translate('xpack.signalInvestigation.logChangePoints.changeType.stepChange', {
        defaultMessage: 'step change',
      });
    case 'trend_change':
      return i18n.translate('xpack.signalInvestigation.logChangePoints.changeType.trendChange', {
        defaultMessage: 'trend change',
      });
    case 'distribution_change':
      return i18n.translate(
        'xpack.signalInvestigation.logChangePoints.changeType.distributionChange',
        { defaultMessage: 'distribution change' }
      );
    default:
      return type;
  }
};

const patternKey = (item: ChangePoint): string =>
  String(item.key || item.pattern || MESSAGE_FIELD).trim();

const patternLabel = (item: ChangePoint): string => {
  const key = patternKey(item);
  if (key.length <= MAX_PATTERN_CHARS) {
    return key;
  }
  // Lodash counts the omission inside `length`, so keep the cut at 120 and add the ellipsis after.
  return `${truncate(key, { length: MAX_PATTERN_CHARS, omission: '' })}…`;
};

const NO_CHANGE_POINT_TYPES: ReadonlySet<string> = new Set([
  'stationary',
  'non_stationary',
  'indeterminable',
]);

const indeterminableResult = (): SignalAnalyzerResult => ({
  leads: [],
  entities: {},
  status: 'indeterminable',
  message: i18n.translate('xpack.signalInvestigation.logChangePoints.indeterminable', {
    defaultMessage: 'Not enough data to decide',
  }),
});

/** Maps categorized log change-point buckets to ranked leads and an explicit analyzer status. */
export const mapLogChangePointBuckets = ({
  items,
  seed,
}: {
  items: readonly ChangePoint[];
  seed: InvestigationSeed;
}): SignalAnalyzerResult => {
  if (items.length === 0) {
    return indeterminableResult();
  }

  const { kql, subject, relationship, relevance } = buildLogEntityKql(seed);
  const significant = items.filter((item) => !NO_CHANGE_POINT_TYPES.has(item.changes.type));

  if (significant.length === 0) {
    const anyEvaluated = items.some((item) => item.changes.type !== 'indeterminable');
    return anyEvaluated ? { leads: [], entities: {}, status: 'no_change' } : indeterminableResult();
  }

  const allLeads: InvestigationLead[] = significant.map((item) => {
    const pattern = patternLabel(item);
    return {
      id: [
        LOG_CHANGE_POINTS_ANALYZER_ID,
        subject,
        hashLeadIdValue(patternKey(item)),
        item.changes.time ?? 'unknown',
        item.changes.type,
      ].join(':'),
      analyzerId: LOG_CHANGE_POINTS_ANALYZER_ID,
      summary: i18n.translate('xpack.signalInvestigation.logChangePoints.summary', {
        defaultMessage: 'Log pattern "{pattern}" {changeType} on {subject}',
        values: { pattern, changeType: changeTypeLabel(item.changes.type), subject },
      }),
      occurredAt: item.changes.time,
      relevance,
      ranking: {
        signal: changePointSignalBand(item.changes.p_value),
        timing: timingBand(item.changes.time, seed.timeRange.from, seed.timeRange.to),
        relationship,
      },
      locatorParams: {
        kql,
        rangeFrom: seed.timeRange.from,
        rangeTo: seed.timeRange.to,
        ...(seed.dataViewId ? { dataViewId: seed.dataViewId } : {}),
      },
    };
  });

  const ranked = [...allLeads].sort(compareLeads);
  const leads = ranked.slice(0, MAX_LOG_LEADS);
  const truncated = ranked.length > MAX_LOG_LEADS;

  return {
    leads,
    entities: {},
    status: 'found',
    message: truncated
      ? i18n.translate('xpack.signalInvestigation.logChangePoints.leadCap', {
          defaultMessage: 'Showing the first {max} leads.',
          values: { max: leads.length },
        })
      : undefined,
  };
};

export const createLogChangePointsAnalyzer = ({
  getLogsDataAccess,
  getDataViews,
  getLogViews,
}: {
  getLogsDataAccess: () => Promise<LogsDataAccessPluginStart>;
  getDataViews: () => Promise<DataViewsServerPluginStart>;
  getLogViews: () => Promise<LogsSharedPluginStart['logViews'] | undefined>;
}): SignalAnalyzer => ({
  id: LOG_CHANGE_POINTS_ANALYZER_ID,
  displayName: i18n.translate('xpack.signalInvestigation.logChangePoints.displayName', {
    defaultMessage: 'Log change points',
  }),
  authz: 'es_delegated',
  getApplicability: logChangePointsApplicability,
  run: async (seed, deps, abortSignal) => {
    const { kql } = buildLogEntityKql(seed);
    const coreContext = await deps.context.core;
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
      esClient: coreContext.elasticsearch.client.asCurrentUser,
      request: deps.request,
      logSourcesService,
    });
    if (resolved.kind === 'unavailable') {
      return unavailableDataViewResult();
    }
    if (resolved.kind === 'non_logs') {
      return nonLogIndexResult();
    }
    const { start, end } = changePointWindow(seed.timeRange.from, seed.timeRange.to);

    const items = await getLogChangePoint({
      index: resolved.index,
      start,
      end,
      kqlFilter: kql,
      messageField: MESSAGE_FIELD,
      timeField: resolved.timeField,
      esClient: coreContext.elasticsearch.client,
      signal: abortSignal,
    });

    return mapLogChangePointBuckets({ items, seed });
  },
});
