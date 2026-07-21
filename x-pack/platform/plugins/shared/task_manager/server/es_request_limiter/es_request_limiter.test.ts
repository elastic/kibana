/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { EsRequestLimitsConfig } from '../config';
import { EsRequestLimiter } from './es_request_limiter';
import { EsRequestCategory } from './es_request_categories';

const createLimiter = (config: EsRequestLimitsConfig) =>
  new EsRequestLimiter({ config, logger: loggingSystemMock.createLogger() });

describe('EsRequestLimiter', () => {
  describe('when disabled', () => {
    it('always allows acquisition and never counts in-flight requests', () => {
      const limiter = createLimiter({ enabled: false, search: { cluster_wide: 1 } });

      expect(limiter.tryAcquire(EsRequestCategory.Search)).toBe(true);
      expect(limiter.tryAcquire(EsRequestCategory.Search)).toBe(true);

      const stats = limiter.getStats();
      expect(stats.enabled).toBe(false);
      expect(stats.categories[EsRequestCategory.Search].inFlight).toBe(0);
    });
  });

  describe('uncapped categories', () => {
    it('allows requests without counting when the category has no configured budget', () => {
      const limiter = createLimiter({ enabled: true, search: { cluster_wide: 1 } });

      // write has no budget configured
      expect(limiter.tryAcquire(EsRequestCategory.Write)).toBe(true);
      expect(limiter.tryAcquire(EsRequestCategory.Write)).toBe(true);
      expect(limiter.getStats().categories[EsRequestCategory.Write].inFlight).toBe(0);
    });
  });

  describe('category budget', () => {
    it('rejects once the per-node ceiling is reached and recovers after release', () => {
      const limiter = createLimiter({ enabled: true, search: { cluster_wide: 2 } });

      expect(limiter.tryAcquire(EsRequestCategory.Search)).toBe(true);
      expect(limiter.tryAcquire(EsRequestCategory.Search)).toBe(true);
      expect(limiter.tryAcquire(EsRequestCategory.Search)).toBe(false);

      expect(limiter.getStats().categories[EsRequestCategory.Search]).toEqual({
        nodeCeiling: 2,
        inFlight: 2,
        rejections: 1,
      });

      limiter.release(EsRequestCategory.Search);
      expect(limiter.tryAcquire(EsRequestCategory.Search)).toBe(true);
      expect(limiter.getStats().categories[EsRequestCategory.Search].inFlight).toBe(2);
    });

    it('does not decrement below zero on extra releases', () => {
      const limiter = createLimiter({ enabled: true, search: { cluster_wide: 2 } });
      limiter.release(EsRequestCategory.Search);
      expect(limiter.getStats().categories[EsRequestCategory.Search].inFlight).toBe(0);
    });
  });

  describe('cluster-wide partitioning by active node count', () => {
    it('divides the cluster-wide budget across active nodes (floor)', () => {
      const limiter = createLimiter({ enabled: true, search: { cluster_wide: 10 } });
      limiter.setActiveNodeCount(5);

      expect(limiter.getStats().categories[EsRequestCategory.Search].nodeCeiling).toBe(2);
      expect(limiter.tryAcquire(EsRequestCategory.Search)).toBe(true);
      expect(limiter.tryAcquire(EsRequestCategory.Search)).toBe(true);
      expect(limiter.tryAcquire(EsRequestCategory.Search)).toBe(false);
    });

    it('guarantees each node at least one slot even when nodes outnumber the budget', () => {
      const limiter = createLimiter({ enabled: true, search: { cluster_wide: 1 } });
      limiter.setActiveNodeCount(5);

      expect(limiter.getStats().categories[EsRequestCategory.Search].nodeCeiling).toBe(1);
      expect(limiter.tryAcquire(EsRequestCategory.Search)).toBe(true);
      expect(limiter.tryAcquire(EsRequestCategory.Search)).toBe(false);
    });

    it('treats a node count below one as a single node', () => {
      const limiter = createLimiter({ enabled: true, search: { cluster_wide: 4 } });
      limiter.setActiveNodeCount(0);
      expect(limiter.getStats().categories[EsRequestCategory.Search].nodeCeiling).toBe(4);
    });
  });

  describe('scope sub-budgets', () => {
    it('applies a configured scope cap in addition to the category budget', () => {
      const limiter = createLimiter({
        enabled: true,
        search: { cluster_wide: 10 },
        scopes: { alerting: { search: 1 } },
      });

      expect(
        limiter.tryAcquire(EsRequestCategory.Search, { taskType: 'alerting:x', scope: 'alerting' })
      ).toBe(true);
      // second request of the same scope is rejected by the scope cap
      expect(
        limiter.tryAcquire(EsRequestCategory.Search, { taskType: 'alerting:y', scope: 'alerting' })
      ).toBe(false);
      // an ungrouped task still has category capacity
      expect(limiter.tryAcquire(EsRequestCategory.Search, { taskType: 'other' })).toBe(true);
    });

    it('shares one budget across task types that resolve to the same scope', () => {
      const limiter = createLimiter({
        enabled: true,
        search: { cluster_wide: 10 },
        scopes: { alerting: { search: 1 } },
      });

      expect(
        limiter.tryAcquire(EsRequestCategory.Search, { taskType: 'alerting:x', scope: 'alerting' })
      ).toBe(true);
      // different task type, same scope -> shares the single slot and is rejected
      expect(
        limiter.tryAcquire(EsRequestCategory.Search, { taskType: 'alerting:y', scope: 'alerting' })
      ).toBe(false);

      limiter.release(EsRequestCategory.Search, { taskType: 'alerting:x', scope: 'alerting' });
      expect(
        limiter.tryAcquire(EsRequestCategory.Search, { taskType: 'alerting:y', scope: 'alerting' })
      ).toBe(true);
    });

    it('ignores a scope that has no configured limit', () => {
      const limiter = createLimiter({ enabled: true, search: { cluster_wide: 10 } });

      // scope has no configured sub-budget, so only the category budget applies
      expect(
        limiter.tryAcquire(EsRequestCategory.Search, { taskType: 'alerting:x', scope: 'alerting' })
      ).toBe(true);
      expect(
        limiter.tryAcquire(EsRequestCategory.Search, { taskType: 'alerting:y', scope: 'alerting' })
      ).toBe(true);
      expect(limiter.getStats().scopes).toEqual([]);
    });

    it('partitions the cluster-wide scope limit across active nodes', () => {
      const limiter = createLimiter({
        enabled: true,
        search: { cluster_wide: 50 },
        scopes: { alerting: { search: 10 } },
      });
      limiter.setActiveNodeCount(5);
      const opts = { taskType: 'alerting:x', scope: 'alerting' };

      // ceiling per node = floor(10 / 5) = 2
      expect(limiter.tryAcquire(EsRequestCategory.Search, opts)).toBe(true);
      expect(limiter.tryAcquire(EsRequestCategory.Search, opts)).toBe(true);
      expect(limiter.tryAcquire(EsRequestCategory.Search, opts)).toBe(false);
    });

    it('enforces scope caps even when the category is uncapped', () => {
      const limiter = createLimiter({ enabled: true, scopes: { alerting: { write: 1 } } });
      const opts = { taskType: 'alerting:x', scope: 'alerting' };

      expect(limiter.tryAcquire(EsRequestCategory.Write, opts)).toBe(true);
      expect(limiter.tryAcquire(EsRequestCategory.Write, opts)).toBe(false);

      limiter.release(EsRequestCategory.Write, opts);
      expect(limiter.tryAcquire(EsRequestCategory.Write, opts)).toBe(true);
    });

    it('does not reserve a category slot when the scope gate rejects', () => {
      const limiter = createLimiter({
        enabled: true,
        search: { cluster_wide: 10 },
        scopes: { alerting: { search: 1 } },
      });
      const opts = { taskType: 'alerting:x', scope: 'alerting' };

      limiter.tryAcquire(EsRequestCategory.Search, opts);
      // rejected by scope cap, so no additional category slot should be taken
      expect(limiter.tryAcquire(EsRequestCategory.Search, opts)).toBe(false);
      expect(limiter.getStats().categories[EsRequestCategory.Search].inFlight).toBe(1);
    });
  });

  describe('getStats scopes', () => {
    it('reports per-scope in-flight, ceiling, and rejections', () => {
      const limiter = createLimiter({
        enabled: true,
        search: { cluster_wide: 10 },
        scopes: { alerting: { search: 2 } },
      });
      limiter.setActiveNodeCount(2);
      const opts = { taskType: 'alerting:x', scope: 'alerting' };

      // ceiling per node = floor(2 / 2) = 1
      expect(limiter.tryAcquire(EsRequestCategory.Search, opts)).toBe(true);
      expect(limiter.tryAcquire(EsRequestCategory.Search, opts)).toBe(false);

      const { scopes } = limiter.getStats();
      expect(scopes).toEqual([
        {
          scope: 'alerting',
          category: EsRequestCategory.Search,
          clusterWideLimit: 2,
          nodeCeiling: 1,
          inFlight: 1,
          rejections: 1,
        },
      ]);
    });

    it('reports no scopes when none are configured', () => {
      const limiter = createLimiter({ enabled: true, search: { cluster_wide: 5 } });
      limiter.tryAcquire(EsRequestCategory.Search, { taskType: 'a' });
      expect(limiter.getStats().scopes).toEqual([]);
    });
  });
});
