/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationSeed } from '@kbn/investigation-seed';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import {
  buildAnalysisToolLink,
  buildLeadDrilldownHref,
  buildLeadDrilldownLabel,
  buildLogRateLeadScope,
  buildLogRatePreviewQuery,
} from './aiops_links';

const seed = (overrides: Partial<InvestigationSeed> = {}): InvestigationSeed => ({
  origin: { app: 'alerts', alertId: 'alert-1', ruleTypeId: 'apm.threshold' },
  timeRange: { from: '2026-11-02T11:00:00.000Z', to: '2026-11-02T12:00:00.000Z' },
  filters: [],
  entities: { 'service.name': 'checkout' },
  ...overrides,
});

const shareWithLocators = (
  ids: string[]
): { share: SharePluginStart; calls: Array<{ id: string; params: unknown }> } => {
  const calls: Array<{ id: string; params: unknown }> = [];
  const share = {
    url: {
      locators: {
        get: (id: string) =>
          ids.includes(id)
            ? {
                getRedirectUrl: (params: unknown) => {
                  calls.push({ id, params });
                  return `/redirect/${id}`;
                },
              }
            : undefined,
      },
    },
  } as unknown as SharePluginStart;
  return { share, calls };
};

describe('buildAnalysisToolLink', () => {
  it('opens the Change Point Detection data-view picker for APM change points and labels it a related tool', () => {
    const { share, calls } = shareWithLocators(['ML_APP_LOCATOR']);
    const link = buildAnalysisToolLink({
      analyzerId: 'service_change_points',
      seed: seed(),
      share,
      canUseAiops: true,
    });

    expect(link.technique).toBe('Change point detection');
    expect(link.label).toContain('related tool');
    expect(link.href).toBe('/redirect/ML_APP_LOCATOR');
    expect(calls[0]?.params).toEqual({
      page: 'aiops/change_point_detection_index_select',
      pageState: {
        globalState: {
          time: { from: '2026-11-02T11:00:00.000Z', to: '2026-11-02T12:00:00.000Z' },
        },
      },
    });
  });

  it('links log change points to Log Pattern Analysis with the data view when present and the picker when absent', () => {
    const { share, calls } = shareWithLocators(['ML_APP_LOCATOR']);
    buildAnalysisToolLink({
      analyzerId: 'log_change_points',
      seed: seed({ dataViewId: 'logs-view' }),
      share,
      canUseAiops: true,
    });
    buildAnalysisToolLink({
      analyzerId: 'log_change_points',
      seed: seed(),
      share,
      canUseAiops: true,
    });

    expect(calls.map((call) => (call.params as { page: string }).page)).toEqual([
      'aiops/log_categorization',
      'aiops/log_categorization_index_select',
    ]);
  });

  it('links log rate analysis to Log Rate Analysis with the data view when present and the picker when absent', () => {
    const { share, calls } = shareWithLocators(['ML_APP_LOCATOR']);
    const withDataView = buildAnalysisToolLink({
      analyzerId: 'log_rate_analysis',
      seed: seed({ dataViewId: 'logs-view' }),
      share,
      canUseAiops: true,
    });
    const withoutDataView = buildAnalysisToolLink({
      analyzerId: 'log_rate_analysis',
      seed: seed(),
      share,
      canUseAiops: true,
    });

    expect(withDataView.technique).toBe('Log rate analysis');
    expect(withDataView.label).toBe('Open Log Rate Analysis');
    expect(withoutDataView.href).toBe('/redirect/ML_APP_LOCATOR');
    expect(calls.map((call) => (call.params as { page: string }).page)).toEqual([
      'aiops/log_rate_analysis',
      'aiops/log_rate_analysis_index_select',
    ]);

    buildAnalysisToolLink({
      analyzerId: 'log_rate_analysis',
      seed: seed({ dataViewId: 'esql-session-view', query: { esql: 'FROM logs-*' } }),
      share,
      canUseAiops: true,
    });
    expect((calls[2]?.params as { page: string }).page).toBe(
      'aiops/log_rate_analysis_index_select'
    );
  });

  it('omits the href when the ML locator is not registered', () => {
    const { share } = shareWithLocators([]);
    const link = buildAnalysisToolLink({
      analyzerId: 'log_change_points',
      seed: seed({ dataViewId: 'logs-view' }),
      share,
      canUseAiops: true,
    });

    expect(link.href).toBeUndefined();
  });

  it('keeps the technique name and omits the href when the user cannot use AIOps', () => {
    const { share } = shareWithLocators(['ML_APP_LOCATOR']);
    const link = buildAnalysisToolLink({
      analyzerId: 'service_change_points',
      seed: seed(),
      share,
      canUseAiops: false,
    });

    expect(link.technique).toBe('Change point detection');
    expect(link.href).toBeUndefined();
  });
});

describe('buildLeadDrilldownHref', () => {
  it('builds service, dependency, and log drill-down links through their locators', () => {
    const { share, calls } = shareWithLocators([
      'serviceOverviewLocator',
      'dependencyOverviewLocator',
      'LOGS_LOCATOR',
    ]);

    expect(
      buildLeadDrilldownHref({
        lead: {
          id: '1',
          analyzerId: 'dependency_change_points',
          summary: 'Latency spike on redis',
          relevance: 'One-hop dependency redis',
          ranking: { signal: 'strong', timing: 'during', relationship: 'dependency' },
          locatorParams: { dependencyName: 'redis' },
        },
        seed: seed(),
        share,
      })
    ).toBe('/redirect/dependencyOverviewLocator');

    expect(
      buildLeadDrilldownHref({
        lead: {
          id: '2',
          analyzerId: 'log_change_points',
          summary: 'Log pattern spike on checkout',
          relevance: 'Logs for service checkout',
          ranking: { signal: 'strong', timing: 'during', relationship: 'service' },
          locatorParams: { kql: 'service.name : "checkout"' },
        },
        seed: seed(),
        share,
      })
    ).toBe('/redirect/LOGS_LOCATOR');

    expect(
      buildLeadDrilldownHref({
        lead: {
          id: '3',
          analyzerId: 'log_rate_analysis',
          summary: 'log.level: "error" (10 in baseline to 50 in deviation, p = 0.001)',
          relevance: 'Logs for service checkout',
          ranking: { signal: 'strong', timing: 'during', relationship: 'service' },
          locatorParams: {
            'entity.0.field': 'service.name',
            'entity.0.value': 'checkout',
            leadField: 'log.level',
            leadValue: 'error',
          },
        },
        seed: seed(),
        share,
      })
    ).toBe('/redirect/LOGS_LOCATOR');

    expect(calls.map((call) => call.id)).toEqual([
      'dependencyOverviewLocator',
      'LOGS_LOCATOR',
      'LOGS_LOCATOR',
    ]);
    expect(calls[1]?.params).toEqual({
      timeRange: { from: '2026-11-02T11:00:00.000Z', to: '2026-11-02T12:00:00.000Z' },
      tab: { id: 'new' },
      query: { language: 'kuery', query: 'service.name : "checkout"' },
    });
  });

  it('keeps a log rate analysis link aligned with the analysed query, filters, and data view', () => {
    const { share, calls } = shareWithLocators(['LOGS_LOCATOR']);
    const logSeed = seed({
      query: { language: 'lucene', query: 'status:500' },
      filters: [{ meta: { key: 'host.name' }, query: { term: { 'host.name': 'web-1' } } }],
    });

    buildLeadDrilldownHref({
      lead: {
        id: 'pattern',
        analyzerId: 'log_rate_analysis',
        summary: 'message pattern',
        relevance: 'Logs for service checkout',
        ranking: { signal: 'strong', timing: 'before', relationship: 'service' },
        locatorParams: {
          'entity.0.field': 'service.name',
          'entity.0.value': 'checkout',
          indexPattern: 'logs-*',
          timeField: 'event.ingested',
          rangeFrom: '2026-11-02T10:59:00.000Z',
          rangeTo: '2026-11-02T11:10:00.000Z',
        },
      },
      seed: logSeed,
      share,
    });
    buildLeadDrilldownHref({
      lead: {
        id: 'field',
        analyzerId: 'log_rate_analysis',
        summary: 'log.level error',
        relevance: 'Logs for service checkout',
        ranking: { signal: 'strong', timing: 'before', relationship: 'service' },
        locatorParams: {
          'entity.0.field': 'service.name',
          'entity.0.value': 'checkout',
          leadField: 'log.level',
          leadValue: 'error',
          dataViewId: 'logs-view',
        },
      },
      seed: logSeed,
      share,
    });

    expect(calls[0]?.params).toEqual({
      timeRange: { from: '2026-11-02T10:59:00.000Z', to: '2026-11-02T11:10:00.000Z' },
      tab: { id: 'new' },
      dataViewSpec: { title: 'logs-*', timeFieldName: 'event.ingested' },
      query: { language: 'lucene', query: 'status:500' },
      filters: [
        { meta: { key: 'host.name' }, query: { term: { 'host.name': 'web-1' } } },
        {
          meta: {
            index: undefined,
            key: 'service.name',
            params: { query: 'checkout' },
            type: 'phrase',
          },
          query: { match_phrase: { 'service.name': 'checkout' } },
        },
      ],
    });
    expect(calls[1]?.params).toMatchObject({
      dataViewId: 'logs-view',
      tab: { id: 'new' },
      query: { language: 'lucene', query: 'status:500' },
      filters: [
        { meta: { key: 'host.name' }, query: { term: { 'host.name': 'web-1' } } },
        {
          meta: {
            index: 'logs-view',
            key: 'service.name',
            params: { query: 'checkout' },
            type: 'phrase',
          },
          query: { match_phrase: { 'service.name': 'checkout' } },
        },
        {
          meta: {
            index: 'logs-view',
            key: 'log.level',
            params: { query: 'error' },
            type: 'phrase',
          },
          query: { match_phrase: { 'log.level': 'error' } },
        },
      ],
    });
    expect(calls[1]?.params).not.toHaveProperty('dataViewSpec');

    buildLeadDrilldownHref({
      lead: {
        id: 'esql-lead',
        analyzerId: 'log_rate_analysis',
        summary: 'log.level error',
        relevance: 'Logs in the selected window',
        ranking: { signal: 'strong', timing: 'during', relationship: 'unknown' },
        locatorParams: {
          leadField: 'log.level',
          leadValue: 'error',
          dataViewId: 'esql-session-view',
          indexPattern: 'logs-payments-*',
          timeField: '@timestamp',
        },
      },
      seed: seed({
        dataViewId: 'esql-session-view',
        query: { esql: 'FROM logs-payments-* | SORT @timestamp DESC' },
      }),
      share,
    });
    expect(calls[2]?.params).not.toHaveProperty('dataViewId');
    expect(calls[2]?.params).toMatchObject({
      dataViewSpec: { title: 'logs-payments-*', timeFieldName: '@timestamp' },
    });
  });

  it('builds drill-downs for host metric change points and service anomalies, plus the anomaly settings link when not set up', () => {
    const { share, calls } = shareWithLocators(['ASSET_DETAILS_LOCATOR', 'ML_APP_LOCATOR']);

    expect(
      buildLeadDrilldownHref({
        lead: {
          id: 'host-cpu',
          analyzerId: 'metric_change_points',
          summary: 'CPU usage spike on web-1',
          relevance: 'Host web-1',
          ranking: { signal: 'strong', timing: 'during', relationship: 'host' },
          locatorParams: {
            hostName: 'web-1',
            rangeFrom: '2026-11-02T11:00:00.000Z',
            rangeTo: '2026-11-02T12:00:00.000Z',
          },
        },
        seed: seed(),
        share,
      })
    ).toBe('/redirect/ASSET_DETAILS_LOCATOR');

    expect(
      buildLeadDrilldownHref({
        lead: {
          id: 'anomaly-1',
          analyzerId: 'service_anomalies',
          summary: 'Transaction latency anomaly on checkout',
          relevance: 'Same service',
          ranking: { signal: 'strong', timing: 'during', relationship: 'service' },
          locatorParams: {
            serviceName: 'checkout',
            transactionType: 'request',
            jobId: 'apm-prod-latency',
            rangeFrom: '2026-11-02T11:00:00.000Z',
            rangeTo: '2026-11-02T12:00:00.000Z',
          },
        },
        seed: seed(),
        share,
      })
    ).toBe('/redirect/ML_APP_LOCATOR');

    expect(calls[0]?.params).toEqual({
      entityType: 'host',
      entityId: 'web-1',
      assetDetails: {
        dateRange: {
          from: '2026-11-02T11:00:00.000Z',
          to: '2026-11-02T12:00:00.000Z',
        },
      },
    });
    expect(calls[1]?.params).toEqual({
      page: 'timeseriesexplorer',
      pageState: {
        jobIds: ['apm-prod-latency'],
        timeRange: { from: '2026-11-02T11:00:00.000Z', to: '2026-11-02T12:00:00.000Z' },
        entities: {
          'service.name': 'checkout',
          'transaction.type': 'request',
        },
      },
    });

    expect(
      buildAnalysisToolLink({
        analyzerId: 'service_anomalies',
        seed: seed(),
        canUseAiops: false,
        status: 'not_set_up',
        basePath: '/kbn',
      })
    ).toEqual({
      technique: 'Anomaly detection',
      label: 'Open Anomaly Detection settings',
      href: '/kbn/app/apm/settings/anomaly-detection',
    });

    expect(buildLeadDrilldownLabel('log_rate_analysis')).toBe('Open in Discover');
    expect(buildLeadDrilldownLabel('log_change_points')).toBe('Open in Discover');
    expect(buildLeadDrilldownLabel('metric_change_points')).toBe('Open host details');
    expect(buildLeadDrilldownLabel('dependency_change_points')).toBe('Open in APM');
  });

  it('builds a shared log rate scope and preview query that preserves seed query, filters, entity scope, lead filter, and time range', () => {
    const logSeed = seed({
      query: { language: 'lucene', query: 'status:500' },
      filters: [{ meta: { key: 'host.name' }, query: { term: { 'host.name': 'web-1' } } }],
    });
    const scope = buildLogRateLeadScope({
      lead: {
        id: 'lra-1',
        analyzerId: 'log_rate_analysis',
        summary: 'error.message: "PAYMENT_TIMEOUT"',
        relevance: 'Logs for service checkout',
        ranking: { signal: 'strong', timing: 'during', relationship: 'service' },
        locatorParams: {
          'entity.0.field': 'service.name',
          'entity.0.value': 'checkout',
          leadField: 'error.message',
          leadValue: 'PAYMENT_TIMEOUT',
          indexPattern: 'logs-payments-*',
          timeField: 'event.ingested',
          rangeFrom: '2026-11-02T11:00:00.000Z',
          rangeTo: '2026-11-02T11:20:00.000Z',
        },
      },
      seed: logSeed,
    });

    expect(buildLogRatePreviewQuery(scope)).toEqual({
      bool: {
        must: [{ query_string: { query: 'status:500' } }],
        filter: [
          { term: { 'host.name': 'web-1' } },
          { match_phrase: { 'service.name': 'checkout' } },
          { match_phrase: { 'error.message': 'PAYMENT_TIMEOUT' } },
          {
            range: {
              'event.ingested': {
                gte: '2026-11-02T11:00:00.000Z',
                lte: '2026-11-02T11:20:00.000Z',
              },
            },
          },
        ],
      },
    });
  });
});
