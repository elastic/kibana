/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getTransformDestinationDataType } from './install';

describe('getTransformDestinationDataType', () => {
  test('should return "logs" when destinationIndex is falsy', () => {
    expect(getTransformDestinationDataType(undefined)).toBe('logs');
    expect(getTransformDestinationDataType('')).toBe('logs');
    expect(getTransformDestinationDataType()).toBe('logs');
  });

  test('should return the expected data type when destinationIndex starts with with one of them and matches the pattern', () => {
    expect(getTransformDestinationDataType('logs-endpoint-default')).toBe('logs');
    expect(getTransformDestinationDataType('metrics-system-default')).toBe('metrics');
    expect(getTransformDestinationDataType('traces-apm-default')).toBe('traces');
    expect(getTransformDestinationDataType('synthetics-browser-default')).toBe('synthetics');
    expect(getTransformDestinationDataType('metrics-system@test-default')).toBe('metrics');
  });

  test('should return "logs" for non-matching patterns', () => {
    expect(getTransformDestinationDataType('custom-index-name')).toBe('logs');
    expect(getTransformDestinationDataType('elasticsearch-index')).toBe('logs');
    expect(getTransformDestinationDataType('random-string')).toBe('logs');
    expect(getTransformDestinationDataType('metrics-single')).toBe('logs');
    expect(getTransformDestinationDataType('traces')).toBe('logs');
    expect(getTransformDestinationDataType('synthetics-')).toBe('logs');
    expect(getTransformDestinationDataType('TRACES-apm-default')).toBe('logs');
    expect(getTransformDestinationDataType('metrics-system.template')).toBe('logs');
    expect(getTransformDestinationDataType('metrics.test.default')).toBe('logs');
  });
});
