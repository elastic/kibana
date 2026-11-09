/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLogRateAnalysisParametersFromAlert } from '@kbn/aiops-log-rate-analysis/get_log_rate_analysis_parameters_from_alert';
import { runLogRateAnalysis } from '@kbn/aiops-log-rate-analysis/queries/fetch_log_rate_analysis_for_alert';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { MAX_INVESTIGATION_FIELD_CHARS, type InvestigationSeed } from '@kbn/investigation-seed';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/server';
import type { SignalAnalyzerDeps } from '@kbn/signal-investigation-contract';
import {
  MAX_LOG_RATE_LEADS,
  buildLogRateSearchQuery,
  createLogRateAnalysisAnalyzer,
  logRateAnalysisApplicability,
  logRateAnalysisWindows,
  mapLogRateAnalysisResult,
  toComparisonWindows,
  type LogRateSignificantItem,
} from './log_rate_analysis_analyzer';

jest.mock('@kbn/aiops-log-rate-analysis/queries/fetch_log_rate_analysis_for_alert', () => ({
  runLogRateAnalysis: jest.fn(),
}));

const runLogRateAnalysisMock = runLogRateAnalysis as jest.MockedFunction<typeof runLogRateAnalysis>;

const seed = (overrides: Partial<InvestigationSeed> = {}): InvestigationSeed => ({
  origin: { app: 'alerts', alertId: 'alert-1', ruleTypeId: 'logs.alert.document.count' },
  timeRange: { from: '2026-11-02T11:00:00.000Z', to: '2026-11-02T11:20:00.000Z' },
  filters: [],
  entities: { 'service.name': 'checkout', 'service.environment': 'production' },
  ...overrides,
});

const item = (overrides: Partial<LogRateSignificantItem> = {}): LogRateSignificantItem => ({
  score: 12,
  pValue: 0.001,
  fieldType: 'metadata',
  fieldName: 'log.level',
  fieldValue: 'error',
  message: '5x higher',
  change: {
    baseline: 10,
    deviation: 50,
  },
  ...overrides,
});

describe('logRateAnalysisApplicability', () => {
  it('runs for log-volume anchors and skips latency alerts, single documents, and ES|QL', () => {
    expect(logRateAnalysisApplicability(seed()).applicable).toBe(true);
    expect(
      logRateAnalysisApplicability(
        seed({
          origin: { app: 'discover', surface: 'histogram' },
        })
      ).applicable
    ).toBe(true);
    expect(
      logRateAnalysisApplicability(
        seed({
          origin: { app: 'dashboard', panelId: 'p-1' },
          metric: { operationType: 'count' },
          indexPattern: 'logs-*',
        })
      ).applicable
    ).toBe(true);
    expect(
      logRateAnalysisApplicability(
        seed({
          origin: { app: 'alerts', alertId: 'alert-1', ruleTypeId: 'apm.transaction_duration' },
        })
      ).applicable
    ).toBe(false);
    expect(
      logRateAnalysisApplicability(
        seed({
          origin: { app: 'discover', surface: 'document', documentId: 'doc-1' },
        })
      ).applicable
    ).toBe(false);
    expect(
      logRateAnalysisApplicability(
        seed({
          query: { esql: 'FROM logs-*' },
        })
      ).applicable
    ).toBe(true);
    expect(
      logRateAnalysisApplicability(
        seed({
          query: { esql: 'FROM logs-* | SORT @timestamp DESC | LIMIT 100' },
        })
      ).applicable
    ).toBe(true);
    expect(
      logRateAnalysisApplicability(
        seed({
          query: { esql: 'FROM logs-* | WHERE log.level == "error"' },
        })
      ).applicable
    ).toBe(false);
    expect(
      logRateAnalysisApplicability(
        seed({
          query: { esql: 'FROM metrics-*' },
        })
      ).applicable
    ).toBe(false);
  });
});

describe('logRateAnalysisWindows', () => {
  it('sizes the deviation window to the selection or timeRange and the baseline to two preceding durations', () => {
    const windows = logRateAnalysisWindows(
      seed({ origin: { app: 'discover', surface: 'histogram' } })
    );
    const twentyMinMs = 20 * 60 * 1000;
    const expectedDeviationMin = Date.parse('2026-11-02T11:00:00.000Z');
    const expectedDeviationMax = Date.parse('2026-11-02T11:20:00.000Z');

    expect(windows).toEqual({
      deviationMin: expectedDeviationMin,
      deviationMax: expectedDeviationMax,
      baselineMax: expectedDeviationMin,
      baselineMin: expectedDeviationMin - 2 * twentyMinMs,
    });
  });

  it('prefers the explicit brushed selection over timeRange', () => {
    const start = Date.parse('2026-11-02T11:05:00.000Z');
    const end = Date.parse('2026-11-02T11:15:00.000Z');
    const windows = logRateAnalysisWindows(seed({ selection: { start, end } }));

    expect(windows).toEqual({
      deviationMin: start,
      deviationMax: end,
      baselineMax: start,
      baselineMin: start - 2 * (end - start),
    });
  });

  it('uses the AIOps alert windows and scales them by the rule lookback', () => {
    const ended = seed({
      origin: {
        app: 'alerts',
        alertId: 'alert-1',
        ruleTypeId: 'logs.alert.document.count',
        alertEnd: '2026-11-02T11:20:00.000Z',
        lookback: { timeSize: 5, timeUnit: 'm' },
      },
    });

    expect(logRateAnalysisWindows(ended)).toEqual(
      getLogRateAnalysisParametersFromAlert({
        alertStartedAt: ended.timeRange.from,
        alertEndedAt: '2026-11-02T11:20:00.000Z',
        timeSize: 5,
        timeUnit: 'm',
      }).windowParameters
    );
  });

  it('starts an active alert deviation window before the alert', () => {
    const active = seed();
    const windows = logRateAnalysisWindows(active);

    expect(windows.deviationMin).toBeLessThan(Date.parse(active.timeRange.from));
  });
});

describe('buildLogRateSearchQuery', () => {
  it('combines seed filters with service and environment terms', () => {
    const query = buildLogRateSearchQuery(seed());
    expect(query).toEqual({
      bool: {
        filter: [
          { term: { 'service.name': 'checkout' } },
          { term: { 'service.environment': 'production' } },
        ],
      },
    });
  });

  it('returns match_all when there are no filters or entities', () => {
    expect(buildLogRateSearchQuery(seed({ entities: {} }))).toEqual({ match_all: {} });
  });
});

describe('mapLogRateAnalysisResult', () => {
  const chartSeed = (overrides: Partial<InvestigationSeed> = {}) =>
    seed({ origin: { app: 'discover', surface: 'histogram' }, ...overrides });
  const windowParameters = logRateAnalysisWindows(chartSeed());

  it('maps zeroDocsFallback to indeterminable and empty items to no_change, including comparison windows and optional pivot', () => {
    const expectedComparison = toComparisonWindows(windowParameters);
    const pivot = { field: 'service.name' as const, value: 'payments-service' };

    expect(
      mapLogRateAnalysisResult({
        result: {
          logRateAnalysisType: 'spike',
          zeroDocsFallback: true,
          significantItems: [],
        },
        seed: chartSeed(),
        windowParameters,
        pivot,
      })
    ).toEqual({
      leads: [],
      entities: {},
      status: 'indeterminable',
      message: 'Not enough data in the baseline or deviation window',
      comparison: expectedComparison,
      pivot,
    });

    expect(
      mapLogRateAnalysisResult({
        result: {
          logRateAnalysisType: 'spike',
          zeroDocsFallback: false,
          significantItems: [],
        },
        seed: chartSeed(),
        windowParameters,
      })
    ).toEqual({
      leads: [],
      entities: {},
      status: 'no_change',
      comparison: expectedComparison,
    });
  });

  it('turns significant items into leads with field/value, baseline vs deviation rate, p-value, and capped at 10', () => {
    const items = Array.from({ length: 12 }, (_, index) =>
      item({
        fieldName: 'log.level',
        fieldValue: `error-${index}`,
        pValue: index === 0 ? 0.04 : 0.001,
      })
    );
    const mapped = mapLogRateAnalysisResult({
      result: {
        logRateAnalysisType: 'spike',
        zeroDocsFallback: false,
        significantItems: items,
      },
      seed: chartSeed({ dataViewId: 'logs-view' }),
      windowParameters,
    });

    expect(mapped.status).toBe('found');
    expect(mapped.comparison).toEqual(toComparisonWindows(windowParameters));
    expect(mapped.leads).toHaveLength(MAX_LOG_RATE_LEADS);
    expect(mapped.message).toBe('Showing the first 10 leads.');
    expect(mapped.leads[0].summary).toContain(
      'log.level: "error-1" (normalized rate 10 in baseline to 50 in deviation, p = 0.001)'
    );
    expect(mapped.leads[0].shift).toEqual({
      baseline: 10,
      deviation: 50,
      kind: 'document_rate',
    });
    expect(mapped.leads[0].ranking).toEqual({
      signal: 'strong',
      timing: 'during',
      relationship: 'service',
    });

    const esqlSeed = chartSeed({
      query: { esql: 'FROM logs-* | SORT @timestamp DESC' },
    });
    const esqlZeroDocs = mapLogRateAnalysisResult({
      result: {
        logRateAnalysisType: 'spike',
        zeroDocsFallback: true,
        significantItems: [],
      },
      seed: esqlSeed,
      windowParameters,
    });
    expect(esqlZeroDocs.message).toBe(
      'Not enough data in the baseline or deviation window. Analyzed on @timestamp.'
    );

    const esqlCapped = mapLogRateAnalysisResult({
      result: {
        logRateAnalysisType: 'spike',
        zeroDocsFallback: false,
        significantItems: items,
      },
      seed: esqlSeed,
      windowParameters,
    });
    expect(esqlCapped.message).toBe('Showing the first 10 leads. Analyzed on @timestamp.');
    expect(mapped.leads[0].locatorParams).toEqual({
      'entity.0.field': 'service.name',
      'entity.0.value': 'checkout',
      'entity.1.field': 'service.environment',
      'entity.1.value': 'production',
      leadField: 'log.level',
      leadValue: 'error-1',
      rangeFrom: '2026-11-02T11:00:00.000Z',
      rangeTo: '2026-11-02T11:20:00.000Z',
      dataViewId: 'logs-view',
    });
  });

  it('labels an alert lead as before the alert and gives long values distinct ids', () => {
    const alertSeed = seed({
      origin: {
        app: 'alerts',
        alertId: 'alert-1',
        ruleTypeId: 'logs.alert.document.count',
        alertEnd: '2026-11-02T11:20:00.000Z',
        lookback: { timeSize: 1, timeUnit: 'm' },
      },
    });
    const windows = logRateAnalysisWindows(alertSeed);
    const prefix = 'x'.repeat(120);
    const mapped = mapLogRateAnalysisResult({
      result: {
        logRateAnalysisType: 'spike',
        zeroDocsFallback: false,
        significantItems: [
          item({ fieldValue: `${prefix}aaa`, fieldType: 'log message pattern' }),
          item({ fieldName: 'error.message', fieldValue: `${prefix}bbb`, pValue: 0.2 }),
        ],
      },
      seed: alertSeed,
      windowParameters: windows,
      index: 'logs-*',
      timeField: 'event.ingested',
    });

    expect(mapped.leads[0].ranking.timing).toBe('before');
    expect(mapped.leads[0].id).not.toBe(mapped.leads[1].id);
    expect(mapped.leads[0].locatorParams).not.toHaveProperty('leadField');
    expect(mapped.leads[0].locatorParams).toMatchObject({
      indexPattern: 'logs-*',
      timeField: 'event.ingested',
    });
  });

  it('keeps 120 characters of a field value and truncates the 121st', () => {
    const exact = 'e'.repeat(120);
    const longer = 'l'.repeat(121);
    const mapped = mapLogRateAnalysisResult({
      result: {
        logRateAnalysisType: 'spike',
        zeroDocsFallback: false,
        significantItems: [
          item({ fieldValue: `  ${exact}  ` }),
          item({ fieldName: 'error.message', fieldValue: longer, pValue: 0.2 }),
        ],
      },
      seed: chartSeed(),
      windowParameters,
    });

    const exactLead = mapped.leads.find((lead) => lead.summary.includes('log.level'));
    const truncatedLead = mapped.leads.find((lead) => lead.summary.includes('error.message'));
    expect(exactLead?.summary).toContain(`"${exact}"`);
    expect(exactLead?.summary).not.toContain('…');
    expect(truncatedLead?.summary).toContain(`"${'l'.repeat(120)}…"`);
    expect(truncatedLead?.summary).not.toContain(longer);
  });

  it('collapses same-documents duplicates before applying the lead cap, prefers a field lead over a message pattern, and keeps same-value fields with different rates separate', () => {
    const duplicateGroup = [
      item({
        fieldType: 'log message pattern',
        fieldName: 'message',
        fieldValue: 'PAYMENT_TIMEOUT',
        pValue: 0.0001,
        change: { baseline: 0, deviation: 4290 },
      }),
      item({
        fieldType: 'metadata',
        fieldName: 'error.message',
        fieldValue: 'PAYMENT_TIMEOUT',
        pValue: 0.0001,
        change: { baseline: 0, deviation: 4290 },
      }),
      item({
        fieldType: 'metadata',
        fieldName: 'event.original',
        fieldValue: 'PAYMENT_TIMEOUT',
        pValue: 0.0001,
        change: { baseline: 0, deviation: 4290 },
      }),
    ];
    const differentRateSameValue = item({
      fieldType: 'metadata',
      fieldName: 'http.response.body',
      fieldValue: 'PAYMENT_TIMEOUT',
      pValue: 0.002,
      change: { baseline: 12, deviation: 4290 },
    });
    const fillerDistinct = Array.from({ length: 8 }, (_, index) =>
      item({
        fieldType: 'metadata',
        fieldName: `custom.field_${index}`,
        fieldValue: `val-${index}`,
        pValue: 0.01 + index * 0.001,
      })
    );

    const tenDistinctWithDuplicates = mapLogRateAnalysisResult({
      result: {
        logRateAnalysisType: 'spike',
        zeroDocsFallback: false,
        significantItems: [...duplicateGroup, differentRateSameValue, ...fillerDistinct],
      },
      seed: chartSeed({ dataViewId: 'logs-view' }),
      windowParameters,
    });

    expect(tenDistinctWithDuplicates.leads).toHaveLength(MAX_LOG_RATE_LEADS);
    expect(tenDistinctWithDuplicates.message).toBeUndefined();
    expect(tenDistinctWithDuplicates.leads[0].summary).toContain(
      'error.message: "PAYMENT_TIMEOUT"'
    );
    expect(tenDistinctWithDuplicates.leads[0].locatorParams).toMatchObject({
      leadField: 'error.message',
      leadValue: 'PAYMENT_TIMEOUT',
    });
    expect(tenDistinctWithDuplicates.leads[0].relatedFields).toEqual(['message', 'event.original']);
    expect(
      tenDistinctWithDuplicates.leads.some((lead) =>
        lead.summary.includes('http.response.body: "PAYMENT_TIMEOUT"')
      )
    ).toBe(true);

    const elevenDistinctWithDuplicates = mapLogRateAnalysisResult({
      result: {
        logRateAnalysisType: 'spike',
        zeroDocsFallback: false,
        significantItems: [
          ...duplicateGroup,
          differentRateSameValue,
          ...fillerDistinct,
          item({
            fieldType: 'metadata',
            fieldName: 'extra.field',
            fieldValue: 'extra-value',
            pValue: 0.04,
          }),
        ],
      },
      seed: chartSeed({ dataViewId: 'logs-view' }),
      windowParameters,
    });

    expect(elevenDistinctWithDuplicates.leads).toHaveLength(MAX_LOG_RATE_LEADS);
    expect(elevenDistinctWithDuplicates.message).toBe('Showing the first 10 leads.');
  });
});

describe('createLogRateAnalysisAnalyzer', () => {
  const asCurrentUser = { search: jest.fn() };
  const deps = {
    request: {},
    context: {
      core: Promise.resolve({
        savedObjects: { client: {} },
        elasticsearch: { client: { asCurrentUser } },
      }),
    },
  } as unknown as SignalAnalyzerDeps;

  const getFlattenedLogSources = jest.fn(async () => 'logs-*,filebeat-*');
  const dataViewGet = jest.fn();
  const getResolvedLogView = jest.fn();
  const analyzer = createLogRateAnalysisAnalyzer({
    getLogsDataAccess: async () =>
      ({
        services: {
          logSourcesServiceFactory: {
            getLogSourcesService: async () => ({ getFlattenedLogSources }),
          },
        },
      } as unknown as LogsDataAccessPluginStart),
    getDataViews: async () =>
      ({
        dataViewsServiceFactory: async () => ({ get: dataViewGet }),
      } as never),
    getLogViews: async () => ({ getScopedClient: () => ({ getResolvedLogView }) } as never),
  });

  beforeEach(() => {
    runLogRateAnalysisMock.mockReset();
    runLogRateAnalysisMock.mockResolvedValue({
      logRateAnalysisType: 'spike',
      zeroDocsFallback: false,
      significantItems: [],
    } as never);
    asCurrentUser.search.mockReset();
    asCurrentUser.search.mockResolvedValue({ aggregations: {} });
    getFlattenedLogSources.mockClear();
  });

  it('uses the seed indexPattern when provided and forwards the abort signal', async () => {
    const controller = new AbortController();
    await analyzer.run(seed({ indexPattern: 'logs-app-*' }), deps, controller.signal);

    expect(getFlattenedLogSources).not.toHaveBeenCalled();
    expect(runLogRateAnalysisMock).toHaveBeenCalledWith(
      expect.objectContaining({
        esClient: asCurrentUser,
        abortSignal: controller.signal,
        arguments: expect.objectContaining({
          index: 'logs-app-*',
          timefield: '@timestamp',
        }),
      })
    );
  });

  it('rejects a mixed indexPattern in applicability, strips non-log parts from a saved data view, and reports an alerts-only pattern as not applicable', async () => {
    expect(
      logRateAnalysisApplicability(
        seed({
          indexPattern: 'logs-*,metrics-*',
        })
      ).applicable
    ).toBe(false);

    dataViewGet.mockResolvedValueOnce({
      getIndexPattern: () => 'logs-*,filebeat-*,apm-*-transaction*,.alerts-security.alerts-*',
      timeFieldName: '@timestamp',
    });

    await analyzer.run(
      seed({
        dataViewId: 'mixed-dv',
      }),
      deps,
      new AbortController().signal
    );

    expect(runLogRateAnalysisMock).toHaveBeenCalledWith(
      expect.objectContaining({
        arguments: expect.objectContaining({
          index: 'logs-*,filebeat-*',
        }),
      })
    );

    runLogRateAnalysisMock.mockClear();
    const alertsOnly = await analyzer.run(
      seed({
        indexPattern: '.alerts-security.alerts-*',
      }),
      deps,
      new AbortController().signal
    );
    expect(alertsOnly.status).toBe('not_applicable');
    expect(runLogRateAnalysisMock).not.toHaveBeenCalled();
  });

  it('falls back to logsDataAccess indices when the seed has no indexPattern', async () => {
    await analyzer.run(seed(), deps, new AbortController().signal);

    expect(getFlattenedLogSources).toHaveBeenCalled();
    expect(runLogRateAnalysisMock).toHaveBeenCalledWith(
      expect.objectContaining({
        arguments: expect.objectContaining({
          index: 'logs-*,filebeat-*',
        }),
      })
    );
  });

  it('resolves a saved data view ahead of a copied indexPattern, falls back to indexPattern only when the data view is not found, and rethrows forbidden errors', async () => {
    dataViewGet.mockResolvedValueOnce({
      getIndexPattern: () => 'saved-dv-logs-*',
      timeFieldName: 'event.ingested',
    });

    await analyzer.run(
      seed({ dataViewId: 'logs-view', indexPattern: 'copied-logs-*' }),
      deps,
      new AbortController().signal
    );

    expect(runLogRateAnalysisMock).toHaveBeenCalledWith(
      expect.objectContaining({
        arguments: expect.objectContaining({
          index: 'saved-dv-logs-*',
          timefield: 'event.ingested',
        }),
      })
    );

    runLogRateAnalysisMock.mockClear();
    dataViewGet.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createGenericNotFoundError('index-pattern', 'unsaved-lens-dv')
    );

    await analyzer.run(
      seed({ dataViewId: 'unsaved-lens-dv', indexPattern: 'logs-unsaved-*' }),
      deps,
      new AbortController().signal
    );

    expect(runLogRateAnalysisMock).toHaveBeenCalledWith(
      expect.objectContaining({
        arguments: expect.objectContaining({
          index: 'logs-unsaved-*',
          timefield: '@timestamp',
        }),
      })
    );

    runLogRateAnalysisMock.mockClear();
    dataViewGet.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.decorateForbiddenError(new Error('forbidden data view'))
    );

    await expect(
      analyzer.run(
        seed({ dataViewId: 'secret-dv', indexPattern: 'logs-fallback-*' }),
        deps,
        new AbortController().signal
      )
    ).rejects.toThrow('forbidden data view');
    expect(runLogRateAnalysisMock).not.toHaveBeenCalled();
  });

  it('resolves a saved data view, including its time field', async () => {
    dataViewGet.mockResolvedValue({
      getIndexPattern: () => 'app-logs-*',
      timeFieldName: 'event.ingested',
    });

    await analyzer.run(seed({ dataViewId: 'logs-view' }), deps, new AbortController().signal);

    expect(runLogRateAnalysisMock).toHaveBeenCalledWith(
      expect.objectContaining({
        arguments: expect.objectContaining({
          index: 'app-logs-*',
          timefield: 'event.ingested',
        }),
      })
    );
  });

  it('prefers the alert log view over the copied index pattern', async () => {
    getResolvedLogView.mockResolvedValue({
      indices: 'logs-custom-*',
      timestampField: 'event.ingested',
    });

    await analyzer.run(
      seed({
        indexPattern: 'logs-*',
        origin: {
          app: 'alerts',
          alertId: 'alert-1',
          ruleTypeId: 'logs.alert.document.count',
          logViewId: 'log-view-1',
        },
      }),
      deps,
      new AbortController().signal
    );

    expect(runLogRateAnalysisMock).toHaveBeenCalledWith(
      expect.objectContaining({
        arguments: expect.objectContaining({
          index: 'logs-custom-*',
          timefield: 'event.ingested',
        }),
      })
    );
  });

  it('reports a missing data view as not set up and a metrics data view as not applicable', async () => {
    dataViewGet.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createGenericNotFoundError('index-pattern', 'missing')
    );
    const missing = await analyzer.run(
      seed({ dataViewId: 'missing' }),
      deps,
      new AbortController().signal
    );
    expect(missing).toMatchObject({ status: 'not_set_up' });
    expect(runLogRateAnalysisMock).not.toHaveBeenCalled();

    dataViewGet.mockResolvedValueOnce({
      getIndexPattern: () => 'metrics-*',
      timeFieldName: '@timestamp',
    });
    const metrics = await analyzer.run(
      seed({
        dataViewId: 'metrics-view',
        origin: { app: 'dashboard', panelId: 'panel-1' },
        metric: { operationType: 'count' },
      }),
      deps,
      new AbortController().signal
    );
    expect(metrics.status).toBe('not_applicable');
  });

  it('uses the index pattern when logsShared is unavailable', async () => {
    const withoutLogsShared = createLogRateAnalysisAnalyzer({
      getLogsDataAccess: async () =>
        ({
          services: {
            logSourcesServiceFactory: {
              getLogSourcesService: async () => ({ getFlattenedLogSources }),
            },
          },
        } as unknown as LogsDataAccessPluginStart),
      getDataViews: async () =>
        ({ dataViewsServiceFactory: async () => ({ get: dataViewGet }) } as never),
      getLogViews: async () => undefined,
    });

    await withoutLogsShared.run(
      seed({
        indexPattern: 'logs-*',
        origin: {
          app: 'alerts',
          alertId: 'alert-1',
          ruleTypeId: 'logs.alert.document.count',
          logViewId: 'log-view-1',
        },
      }),
      deps,
      new AbortController().signal
    );

    expect(runLogRateAnalysisMock).toHaveBeenCalledWith(
      expect.objectContaining({
        arguments: expect.objectContaining({ index: 'logs-*', timefield: '@timestamp' }),
      })
    );
  });

  it('rethrows a forbidden data view lookup', async () => {
    dataViewGet.mockRejectedValue(
      SavedObjectsErrorHelpers.decorateForbiddenError(new Error('nope'))
    );

    await expect(
      analyzer.run(seed({ dataViewId: 'secret' }), deps, new AbortController().signal)
    ).rejects.toThrow('nope');
  });

  it('runs a deviation-window terms lookup with the resolved time field and abort signal, returning a single service or host pivot for found, no_change, and indeterminable results', async () => {
    const entitylessSeed = seed({
      origin: { app: 'discover', surface: 'histogram' },
      entities: {},
      indexPattern: 'logs-payments-*',
    });
    const controller = new AbortController();
    const longServiceName = 's'.repeat(200);

    asCurrentUser.search.mockResolvedValueOnce({
      aggregations: {
        service_names: { buckets: [{ key: longServiceName }] },
        host_names: { buckets: [{ key: 'host-a' }, { key: 'host-b' }] },
      },
    });
    const noChange = await analyzer.run(entitylessSeed, deps, controller.signal);

    expect(asCurrentUser.search).toHaveBeenCalledWith(
      {
        index: 'logs-payments-*',
        size: 0,
        track_total_hits: false,
        query: {
          bool: {
            filter: [
              { match_all: {} },
              {
                range: {
                  '@timestamp': {
                    gte: '2026-11-02T11:00:00.000Z',
                    lte: '2026-11-02T11:20:00.000Z',
                  },
                },
              },
            ],
          },
        },
        aggs: {
          service_names: { terms: { field: 'service.name', size: 2 } },
          host_names: { terms: { field: 'host.name', size: 2 } },
        },
      },
      { signal: controller.signal }
    );
    expect(noChange.status).toBe('no_change');
    expect(noChange.pivot).toEqual({ field: 'service.name', value: longServiceName });

    runLogRateAnalysisMock.mockResolvedValueOnce({
      logRateAnalysisType: 'spike',
      zeroDocsFallback: true,
      significantItems: [],
    } as never);
    asCurrentUser.search.mockResolvedValueOnce({
      aggregations: {
        service_names: { buckets: [] },
        host_names: { buckets: [{ key: 'host-only-1' }] },
      },
    });
    const indeterminable = await analyzer.run(entitylessSeed, deps, controller.signal);
    expect(indeterminable.status).toBe('indeterminable');
    expect(indeterminable.pivot).toEqual({ field: 'host.name', value: 'host-only-1' });

    runLogRateAnalysisMock.mockResolvedValueOnce({
      logRateAnalysisType: 'spike',
      zeroDocsFallback: false,
      significantItems: [item()],
    } as never);
    asCurrentUser.search.mockResolvedValueOnce({
      aggregations: {
        service_names: { buckets: [{ key: 'payments-service' }] },
        host_names: { buckets: [] },
      },
    });
    const found = await analyzer.run(entitylessSeed, deps, controller.signal);
    expect(found.status).toBe('found');
    expect(found.pivot).toEqual({ field: 'service.name', value: 'payments-service' });
  });

  it('returns no pivot when two services exist (even with one host), when a value exceeds MAX_INVESTIGATION_FIELD_CHARS, or when the lookup fails', async () => {
    const entitylessSeed = seed({
      origin: { app: 'discover', surface: 'histogram' },
      entities: {},
      indexPattern: 'logs-*',
    });

    asCurrentUser.search.mockResolvedValueOnce({
      aggregations: {
        service_names: { buckets: [{ key: 'svc-a' }, { key: 'svc-b' }] },
        host_names: { buckets: [{ key: 'single-host' }] },
      },
    });
    const twoServicesOneHost = await analyzer.run(
      entitylessSeed,
      deps,
      new AbortController().signal
    );
    expect(twoServicesOneHost.pivot).toBeUndefined();

    asCurrentUser.search.mockResolvedValueOnce({
      aggregations: {
        service_names: { buckets: [{ key: 'x'.repeat(MAX_INVESTIGATION_FIELD_CHARS + 1) }] },
        host_names: { buckets: [] },
      },
    });
    const oversized = await analyzer.run(entitylessSeed, deps, new AbortController().signal);
    expect(oversized.pivot).toBeUndefined();

    asCurrentUser.search.mockRejectedValueOnce(new Error('shard failed'));
    const failedLookup = await analyzer.run(entitylessSeed, deps, new AbortController().signal);
    expect(failedLookup.status).toBe('no_change');
    expect(failedLookup.pivot).toBeUndefined();
  });

  it('skips the lookup when the seed already has a service, a host entity, or seed.hosts, and rethrows an aborted lookup', async () => {
    await analyzer.run(seed({ indexPattern: 'logs-*' }), deps, new AbortController().signal);
    await analyzer.run(
      seed({ indexPattern: 'logs-*', entities: { 'host.name': 'host-1' } }),
      deps,
      new AbortController().signal
    );
    await analyzer.run(
      seed({ indexPattern: 'logs-*', entities: {}, hosts: ['host-1'] }),
      deps,
      new AbortController().signal
    );
    expect(asCurrentUser.search).not.toHaveBeenCalled();

    const controller = new AbortController();
    controller.abort();
    asCurrentUser.search.mockRejectedValueOnce(new Error('aborted'));
    await expect(
      analyzer.run(seed({ indexPattern: 'logs-*', entities: {} }), deps, controller.signal)
    ).rejects.toThrow('aborted');
  });

  it('resolves the index from a read-only ES|QL FROM query and omits the session dataViewId from lead locatorParams', async () => {
    runLogRateAnalysisMock.mockResolvedValueOnce({
      logRateAnalysisType: 'spike',
      zeroDocsFallback: false,
      significantItems: [item()],
    } as never);

    const esqlResult = await analyzer.run(
      seed({
        origin: { app: 'discover', surface: 'appMenu' },
        dataViewId: 'esql-session-view',
        indexPattern: 'wrong-index-*',
        query: { esql: 'FROM logs-payments.api-* | SORT @timestamp DESC | LIMIT 100' },
      }),
      deps,
      new AbortController().signal
    );

    expect(runLogRateAnalysisMock).toHaveBeenCalledWith(
      expect.objectContaining({
        arguments: expect.objectContaining({
          index: 'logs-payments.api-*',
          timefield: '@timestamp',
        }),
      })
    );
    expect(esqlResult.status).toBe('found');
    expect(esqlResult.message).toBe('Analyzed on @timestamp.');
    expect(esqlResult.leads[0].locatorParams).not.toHaveProperty('dataViewId');
    expect(esqlResult.leads[0].locatorParams).toMatchObject({
      indexPattern: 'logs-payments.api-*',
      timeField: '@timestamp',
    });
  });
});
