/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EVENT_RATE_FIELD_ID } from '@kbn/ml-anomaly-utils';
import { loadEsqlFieldValues, loadEsqlLineCharts, type EsqlSearch } from './esql_searches';

const esqlMock = jest.fn();

const HOUR = 60 * 60 * 1000;
const source = {
  search: { esql: esqlMock } as unknown as EsqlSearch,
  esqlQuery: 'FROM logs | EVAL bytes_kb = bytes / 1024',
  timeField: '@timestamp',
  projectRouting: '_alias:_origin',
};

const mockResponse = (columns: string[], values: unknown[][]) =>
  esqlMock.mockResolvedValueOnce({
    rawResponse: { columns: columns.map((name) => ({ name, type: 'keyword' })), values },
  });

describe('esql_searches', () => {
  beforeEach(() => {
    esqlMock.mockReset();
  });

  describe('loadEsqlLineCharts', () => {
    it('runs one re-bucketed query per metric, filtered to the split value', async () => {
      mockResponse(['__ml_metric', '__ml_chart_time'], [[2.5, 0]]);
      mockResponse(['__ml_metric', '__ml_chart_time'], [[7, HOUR]]);

      const results = await loadEsqlLineCharts(
        source,
        0,
        HOUR,
        HOUR,
        [
          { agg: 'avg', field: 'bytes_kb' },
          { agg: 'count', field: EVENT_RATE_FIELD_ID },
        ],
        'host',
        'a'
      );

      expect(results).toEqual({
        0: [
          { time: 0, value: 2.5 },
          { time: HOUR, value: null },
        ],
        1: [
          { time: 0, value: 0 },
          { time: HOUR, value: 7 },
        ],
      });

      const [[avgRequest], [countRequest]] = esqlMock.mock.calls;
      expect(avgRequest.query).toContain('| WHERE TO_STRING(`host`) == ?ml_entity_0');
      expect(avgRequest.query).toContain('AVG(`bytes_kb`)');
      expect(avgRequest.params).toEqual([{ ml_entity_0: 'a' }]);
      expect(avgRequest.query).toContain(
        '| WHERE `@timestamp` >= ?_tstart AND `@timestamp` <= ?_tend'
      );
      expect(avgRequest.kibanaQueryContext.timeRange).toEqual({
        from: new Date(0).toISOString(),
        to: new Date(HOUR).toISOString(),
      });
      expect(avgRequest.filter).toBeUndefined();
      expect(avgRequest.projectRouting).toBe('_alias:_origin');
      expect(countRequest.query).toContain('COUNT(*)');
    });

    it('sums the count column for counts on an aggregated query', async () => {
      mockResponse(['__ml_metric', '__ml_chart_time'], [[42, 0]]);
      mockResponse(['__ml_metric', '__ml_chart_time'], [[3, 0]]);

      const results = await loadEsqlLineCharts(
        { ...source, summaryCountField: 'event_count' },
        0,
        HOUR,
        HOUR,
        [
          { agg: 'count', field: EVENT_RATE_FIELD_ID },
          { agg: 'max', field: 'bytes_kb' },
        ],
        null,
        null
      );

      expect(results[0]).toEqual([
        { time: 0, value: 42 },
        { time: HOUR, value: 0 },
      ]);
      expect(results[1]).toEqual([
        { time: 0, value: 3 },
        { time: HOUR, value: null },
      ]);
      const [[countRequest], [maxRequest]] = esqlMock.mock.calls;
      expect(countRequest.query).toContain('SUM(`event_count`)');
      expect(countRequest.query).not.toContain('COUNT(*)');
      expect(maxRequest.query).toContain('MAX(`bytes_kb`)');
    });

    it('returns an empty series for metrics ES|QL cannot chart', async () => {
      const results = await loadEsqlLineCharts(
        source,
        0,
        HOUR,
        HOUR,
        [{ agg: '', field: 'bytes_kb' }],
        null,
        null
      );

      expect(results).toEqual({ 0: [] });
      expect(esqlMock).not.toHaveBeenCalled();
    });
  });

  describe('loadEsqlFieldValues', () => {
    it('returns the most frequent values of the column', async () => {
      mockResponse(
        ['__ml_value_count', 'host'],
        [
          [5, 'a'],
          [2, 'b'],
        ]
      );

      await expect(loadEsqlFieldValues(source, 'host', 10)).resolves.toEqual(['a', 'b']);
      expect(esqlMock.mock.calls[0][0].query).toContain('| LIMIT 10');
    });
  });
});
