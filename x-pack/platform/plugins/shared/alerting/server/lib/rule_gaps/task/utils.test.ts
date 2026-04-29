/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';
import { backfillClientMock } from '../../../backfill_client/backfill_client.mock';
import { rulesClientMock } from '../../../rules_client.mock';
import type { RulesClientContext } from '../../../rules_client/types';
import { Gap } from '../gap';
import { GAP_AUTO_FILL_STATUS } from '../../../../common/constants';
import {
  resultsFromMap,
  formatConsolidatedSummary,
  checkBackfillCapacity,
  filterGapsWithOverlappingBackfills,
  isCancelled,
  getGapAutoFillRunOutcome,
  type AggregatedByRuleEntry,
} from './utils';
import { GapFillSchedulePerRuleStatus } from '../../../application/gaps/methods/bulk_fill_gaps_by_rule_ids/types';

describe('gap auto fill task utils', () => {
  describe('resultsFromMap and formatConsolidatedSummary', () => {
    it('builds a consolidated summary from aggregated results', () => {
      const aggregated = new Map<string, AggregatedByRuleEntry>([
        [
          'rule-1',
          {
            ruleId: 'rule-1',
            processedGaps: 3,
            status: GapFillSchedulePerRuleStatus.SUCCESS,
          },
        ],
        [
          'rule-2',
          {
            ruleId: 'rule-2',
            processedGaps: 0,
            status: GapFillSchedulePerRuleStatus.ERROR,
            error: 'boom',
          },
        ],
      ]);

      const consolidated = resultsFromMap(aggregated);
      expect(consolidated).toHaveLength(2);
      const summary = formatConsolidatedSummary(consolidated);
      expect(summary).toContain('processed 3 gap');
      expect(summary).toContain('2 rule');
      expect(summary).toContain('1 success');
      expect(summary).toContain('1 error');
      expect(summary).toContain('rule-2 (boom)');
    });
  });

  describe('checkBackfillCapacity', () => {
    it('computes remaining capacity from findBackfill results', async () => {
      const rc = rulesClientMock.create();
      rc.findBackfill.mockResolvedValue({ data: [], total: 2, page: 1, perPage: 1 });

      const res = await checkBackfillCapacity({
        rulesClient: rc,
        maxBackfills: 5,
        logMessage: jest.fn(),
        initiatorId: 'test',
      });
      expect(res.canSchedule).toBe(true);
      expect(res.remainingCapacity).toBe(3);
      expect(res.currentCount).toBe(2);
      expect(res.maxBackfills).toBe(5);
    });

    it('handles errors by returning canSchedule=false', async () => {
      const rc = rulesClientMock.create();
      rc.findBackfill.mockRejectedValue(new Error('boom'));

      const res = await checkBackfillCapacity({
        rulesClient: rc,
        maxBackfills: 4,
        logMessage: jest.fn(),
        initiatorId: 'test',
      });
      expect(res.canSchedule).toBe(false);
      expect(res.remainingCapacity).toBe(4);
      expect(res.currentCount).toBe(0);
      expect(res.maxBackfills).toBe(4);
    });
  });

  describe('filterGapsWithOverlappingBackfills', () => {
    it('filters out gaps that overlap with existing/running backfills', async () => {
      const sor = savedObjectsRepositoryMock.create();
      const actions = actionsClientMock.create();
      const backfills = backfillClientMock.create();

      backfills.findOverlappingBackfills.mockResolvedValue([
        {
          id: 'bf-1',
          start: '2024-01-01T00:30:00.000Z',
          end: '2024-01-01T00:45:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z',
          createdBy: 'system',
          ruleId: 'a',
          spaceId: 'default',
          status: 'running',
        } as unknown as ReturnType<typeof backfillClientMock.create>['scheduleBackfill'],
      ]);

      const ctx = {
        internalSavedObjectsRepository: sor,
        getActionsClient: jest.fn().mockResolvedValue(actions),
        backfillClient: backfills,
      } as unknown as RulesClientContext;

      const gaps = [
        new Gap({
          ruleId: 'a',
          range: { gte: '2024-01-01T00:00:00.000Z', lte: '2024-01-01T01:00:00.000Z' },
        }),
        new Gap({
          ruleId: 'a',
          range: { gte: '2024-01-02T00:00:00.000Z', lte: '2024-01-02T01:00:00.000Z' },
        }),
      ];

      const filtered = await filterGapsWithOverlappingBackfills(gaps, ctx, jest.fn());
      expect(filtered).toHaveLength(1);
      expect(filtered[0].range.gte.toISOString()).toBe('2024-01-02T00:00:00.000Z');
    });
  });

  describe('isCancelled', () => {
    it('returns true when the abort controller is aborted', async () => {
      const abortController = new AbortController();
      abortController.abort();
      const res = isCancelled(abortController);
      expect(res).toBe(true);
    });
  });

  describe('getGapAutoFillRunOutcome', () => {
    const buildEntry = (status: GapFillSchedulePerRuleStatus): AggregatedByRuleEntry => ({
      ruleId: `${status}-rule`,
      processedGaps: 1,
      status,
    });

    it('returns success when all rules succeed', () => {
      const { status, message } = getGapAutoFillRunOutcome([
        buildEntry(GapFillSchedulePerRuleStatus.SUCCESS),
        buildEntry(GapFillSchedulePerRuleStatus.SUCCESS),
      ]);
      expect(status).toBe(GAP_AUTO_FILL_STATUS.SUCCESS);
      expect(message).toContain('All rules successfully scheduled gap fills');
    });

    it('returns error with partial failure message when some rules fail', () => {
      const { status, message } = getGapAutoFillRunOutcome([
        buildEntry(GapFillSchedulePerRuleStatus.SUCCESS),
        buildEntry(GapFillSchedulePerRuleStatus.ERROR),
      ]);
      expect(status).toBe(GAP_AUTO_FILL_STATUS.ERROR);
      expect(message).toContain('At least one rule successfully scheduled gap fills');
    });

    it('returns error when all rules fail', () => {
      const { status, message } = getGapAutoFillRunOutcome([
        buildEntry(GapFillSchedulePerRuleStatus.ERROR),
      ]);
      expect(status).toBe(GAP_AUTO_FILL_STATUS.ERROR);
      expect(message).toContain('All rules failed to schedule gap fills');
    });

    it('returns skipped when no rules can be scheduled', () => {
      const { status, message } = getGapAutoFillRunOutcome([]);
      expect(status).toBe(GAP_AUTO_FILL_STATUS.SKIPPED);
      expect(message).toContain("Skipped execution: can't schedule gap fills for any enabled rule");
    });
  });
});
