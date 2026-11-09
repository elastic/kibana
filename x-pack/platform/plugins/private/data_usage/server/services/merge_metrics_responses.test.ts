/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeMetricsResponses } from './merge_metrics_responses';
import type { UsageMetricsAutoOpsResponseSchemaBody } from './autoops_api';

const series = (name: string) => ({
  name,
  error: null,
  data: [[1726858530000, 1024] as [number, number]],
});

describe('mergeMetricsResponses', () => {
  it('should return an empty body when given no responses', () => {
    expect(mergeMetricsResponses([])).toEqual({});
  });

  it('should return the single response unchanged when given one response', () => {
    const response: UsageMetricsAutoOpsResponseSchemaBody = {
      ingest_rate: [series('ds-1')],
      storage_retained: [series('ds-1')],
    };

    expect(mergeMetricsResponses([response])).toEqual(response);
  });

  it('should concatenate the series of each metric type across responses', () => {
    const merged = mergeMetricsResponses([
      { ingest_rate: [series('ds-1'), series('ds-2')], storage_retained: [series('ds-1')] },
      { ingest_rate: [series('ds-3')], storage_retained: [series('ds-2'), series('ds-3')] },
    ]);

    expect(merged.ingest_rate?.map(({ name }) => name)).toEqual(['ds-1', 'ds-2', 'ds-3']);
    expect(merged.storage_retained?.map(({ name }) => name)).toEqual(['ds-1', 'ds-2', 'ds-3']);
  });

  it('should keep a metric type that is present in only some responses', () => {
    const merged = mergeMetricsResponses([
      { ingest_rate: [series('ds-1')] },
      { storage_retained: [series('ds-2')] },
    ]);

    expect(merged.ingest_rate?.map(({ name }) => name)).toEqual(['ds-1']);
    expect(merged.storage_retained?.map(({ name }) => name)).toEqual(['ds-2']);
  });

  it('should skip empty series lists', () => {
    const merged = mergeMetricsResponses([{ ingest_rate: [] }, { ingest_rate: [series('ds-1')] }]);

    expect(merged.ingest_rate?.map(({ name }) => name)).toEqual(['ds-1']);
  });

  it('should not mutate the responses it was given', () => {
    const first: UsageMetricsAutoOpsResponseSchemaBody = { ingest_rate: [series('ds-1')] };
    const second: UsageMetricsAutoOpsResponseSchemaBody = { ingest_rate: [series('ds-2')] };

    mergeMetricsResponses([first, second]);

    expect(first.ingest_rate).toHaveLength(1);
    expect(second.ingest_rate).toHaveLength(1);
  });
});
