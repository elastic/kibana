/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { CasesAnalyticsV2Service } from './service';
import { V2_NOOP_WRITER, type CasesAnalyticsV2WriterContract } from './writer';

describe('CasesAnalyticsV2Service', () => {
  describe('writer proxy ↔ contract parity', () => {
    // Regression guard: the writer proxy held inside the service is what the
    // reconciliation task and SO-service hooks actually call. If a new method
    // is added to `CasesAnalyticsV2WriterContract` and only the real writer +
    // no-op constant are updated (forgetting the proxy), reconciliation
    // crashes at runtime with "writer.<method> is not a function". This test
    // fails the moment that drift happens.
    it('proxies every method on CasesAnalyticsV2WriterContract', () => {
      const service = new CasesAnalyticsV2Service({
        logger: loggerMock.create(),
        enabled: false, // doesn't matter for proxy shape
      });
      const proxy = service.getWriter();

      // The no-op constant is the canonical implementation of the contract —
      // every key on it must exist as a function on the proxy.
      const contractKeys = Object.keys(V2_NOOP_WRITER) as Array<
        keyof CasesAnalyticsV2WriterContract
      >;
      expect(contractKeys.length).toBeGreaterThan(0); // sanity

      for (const key of contractKeys) {
        expect(typeof proxy[key]).toBe('function');
      }
    });
  });
});
