/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_PIPELINES, SIGNAL_PREFIX, getSignalType } from './utils';

describe('collector_config_view utils', () => {
  describe('constants', () => {
    it('should define ALL_PIPELINES', () => {
      expect(ALL_PIPELINES).toBe('__all__');
    });

    it('should define SIGNAL_PREFIX', () => {
      expect(SIGNAL_PREFIX).toBe('__signal__');
    });
  });

  describe('getSignalType', () => {
    it('should return the signal type from a pipeline id with a slash', () => {
      expect(getSignalType('traces/my-pipeline')).toBe('traces');
    });

    it('should return the signal type for metrics pipelines', () => {
      expect(getSignalType('metrics/pipeline-1')).toBe('metrics');
    });

    it('should return the signal type for logs pipelines', () => {
      expect(getSignalType('logs/pipeline-1')).toBe('logs');
    });

    it('should return the full id when there is no slash', () => {
      expect(getSignalType('traces')).toBe('traces');
    });

    it('should handle pipeline ids with multiple slashes', () => {
      expect(getSignalType('metrics/sub/path')).toBe('metrics');
    });
  });
});
