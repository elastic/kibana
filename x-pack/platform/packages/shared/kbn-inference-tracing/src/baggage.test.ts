/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BAGGAGE_TRACKING_BEACON_KEY,
  BAGGAGE_TRACKING_BEACON_VALUE,
  EVAL_RUN_ID_BAGGAGE_KEY,
  EVAL_THREAD_ID_BAGGAGE_KEY,
} from './baggage';

describe('baggage constants', () => {
  describe('BAGGAGE_TRACKING_BEACON_KEY', () => {
    it('has expected value for inference tracing marker', () => {
      expect(BAGGAGE_TRACKING_BEACON_KEY).toBe('kibana.inference.tracing');
    });
  });

  describe('BAGGAGE_TRACKING_BEACON_VALUE', () => {
    it('has expected value', () => {
      expect(BAGGAGE_TRACKING_BEACON_VALUE).toBe('1');
    });
  });

  describe('EVAL_RUN_ID_BAGGAGE_KEY', () => {
    it('has expected W3C baggage key for eval run id', () => {
      expect(EVAL_RUN_ID_BAGGAGE_KEY).toBe('kibana.evals.run_id');
    });
  });

  describe('EVAL_THREAD_ID_BAGGAGE_KEY', () => {
    it('has expected W3C baggage key for eval thread id', () => {
      expect(EVAL_THREAD_ID_BAGGAGE_KEY).toBe('kibana.evals.thread_id');
    });
  });

  describe('baggage key format', () => {
    it('all keys follow W3C baggage naming convention', () => {
      // W3C baggage keys should be lowercase with dots or dashes as separators
      const keys = [
        BAGGAGE_TRACKING_BEACON_KEY,
        EVAL_RUN_ID_BAGGAGE_KEY,
        EVAL_THREAD_ID_BAGGAGE_KEY,
      ];

      for (const key of keys) {
        // Keys should be lowercase
        expect(key).toBe(key.toLowerCase());
        // Keys should only contain valid characters (alphanumeric, dots, underscores, dashes)
        expect(key).toMatch(/^[a-z0-9._-]+$/);
        // Keys should follow Kibana namespace convention
        expect(key).toMatch(/^kibana\./);
      }
    });
  });
});
