/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageMetricsRequestSchema } from './usage_metrics';

describe('usage_metrics schemas', () => {
  it('should accept valid request query', () => {
    expect(() =>
      UsageMetricsRequestSchema.validate({
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        metricTypes: ['storage_retained'],
        dataStreams: ['data_stream_1', 'data_stream_2', 'data_stream_3'],
      })
    ).not.toThrow();
  });

  it('should accept multiple `metricTypes` in request query', () => {
    expect(() =>
      UsageMetricsRequestSchema.validate({
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        metricTypes: ['ingest_rate', 'storage_retained', 'index_rate'],
        dataStreams: ['data_stream_1', 'data_stream_2', 'data_stream_3'],
      })
    ).not.toThrow();
  });

  it('should accept `dataStream` list', () => {
    expect(() =>
      UsageMetricsRequestSchema.validate({
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        metricTypes: ['storage_retained'],
        dataStreams: ['data_stream_1', 'data_stream_2', 'data_stream_3'],
      })
    ).not.toThrow();
  });

  it('should not error if `dataStream` list is empty', () => {
    expect(() =>
      UsageMetricsRequestSchema.validate({
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        metricTypes: ['storage_retained'],
        dataStreams: [],
      })
    ).not.toThrow();
  });

  it('should error if `dataStream` is given type not array', () => {
    expect(() =>
      UsageMetricsRequestSchema.validate({
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        metricTypes: ['storage_retained'],
        dataStreams: '  ',
      })
    ).toThrow('[dataStreams]: could not parse array value from json input');
  });

  it('should error if `dataStream` is given an empty item in the list', () => {
    expect(() =>
      UsageMetricsRequestSchema.validate({
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        metricTypes: ['storage_retained'],
        dataStreams: ['ds_1', '  '],
      })
    ).toThrow('[dataStreams]: list cannot contain empty values');
  });

  it('should error if `metricTypes` is empty string', () => {
    expect(() =>
      UsageMetricsRequestSchema.validate({
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        dataStreams: ['data_stream_1', 'data_stream_2', 'data_stream_3'],
        metricTypes: ' ',
      })
    ).toThrow('[metricTypes]: could not parse array value from json input');
  });

  it('should error if `metricTypes` contains an empty item', () => {
    expect(() =>
      UsageMetricsRequestSchema.validate({
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        dataStreams: ['data_stream_1', 'data_stream_2', 'data_stream_3'],
        metricTypes: [' ', 'storage_retained'], // First item is invalid
      })
    ).toThrow('list cannot contain empty values');
  });

  it('should error if `metricTypes` is not a valid type', () => {
    expect(() =>
      UsageMetricsRequestSchema.validate({
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        dataStreams: ['data_stream_1', 'data_stream_2', 'data_stream_3'],
        metricTypes: 'foo',
      })
    ).toThrow('[metricTypes]: could not parse array value from json input');
  });

  it('should error if `metricTypes` is not a valid list', () => {
    expect(() =>
      UsageMetricsRequestSchema.validate({
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        dataStreams: ['data_stream_1', 'data_stream_2', 'data_stream_3'],
        metricTypes: ['storage_retained', 'foo'],
      })
    ).toThrow(
      '[metricTypes]: must be one of ingest_rate, storage_retained, search_vcu, ingest_vcu, ml_vcu, index_latency, index_rate, search_latency, search_rate'
    );
  });

  it('should error if `from` is not a valid input', () => {
    expect(() =>
      UsageMetricsRequestSchema.validate({
        from: 1010,
        to: new Date().toISOString(),
        dataStreams: ['data_stream_1', 'data_stream_2', 'data_stream_3'],
        metricTypes: ['storage_retained', 'foo'],
      })
    ).toThrow('[from]: expected value of type [string] but got [number]');
  });

  it('should error if `to` is not a valid input', () => {
    expect(() =>
      UsageMetricsRequestSchema.validate({
        from: new Date().toISOString(),
        to: 1010,
        dataStreams: ['data_stream_1', 'data_stream_2', 'data_stream_3'],
        metricTypes: ['storage_retained', 'foo'],
      })
    ).toThrow('[to]: expected value of type [string] but got [number]');
  });

  it('should error if `from` is empty string', () => {
    expect(() =>
      UsageMetricsRequestSchema.validate({
        from: ' ',
        to: new Date().toISOString(),
        dataStreams: ['data_stream_1', 'data_stream_2', 'data_stream_3'],
        metricTypes: ['storage_retained', 'foo'],
      })
    ).toThrow('[from]: Date ISO string must not be empty');
  });

  it('should error if `to` is empty string', () => {
    expect(() =>
      UsageMetricsRequestSchema.validate({
        from: new Date().toISOString(),
        to: '   ',
        dataStreams: ['data_stream_1', 'data_stream_2', 'data_stream_3'],
        metricTypes: ['storage_retained', 'foo'],
      })
    ).toThrow('[to]: Date ISO string must not be empty');
  });
});
