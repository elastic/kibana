/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { getGetResultsStepDefinition } from './get_results_step';
import { createStepHandlerContext, createMockOsqueryContext } from './test_utils';

const makeActionHit = (agents: string[]) => ({
  hits: { hits: [{ _source: { action_id: 'action-1', agents } }] },
});

const makeAgentCountResponse = (count: number) => ({
  aggregations: { unique_agents: { value: count } },
});

const makeResultHits = (rows: Array<Record<string, unknown>>) => ({
  hits: {
    hits: rows.map((row, i) => ({
      fields: Object.fromEntries(Object.entries(row).map(([k, v]) => [`osquery.${k}`, [v]])),
      sort: [`2024-01-01`, `id${i}`],
    })),
  },
});

describe('osquery.getResults step', () => {
  describe('authorization', () => {
    it('should throw PermissionError when author lacks readLiveQueries', async () => {
      const osqueryContext = createMockOsqueryContext({ readLiveQueries: false });
      const stepDef = getGetResultsStepDefinition(osqueryContext as any);

      const context = createStepHandlerContext({
        input: { action_id: 'action-1' },
        stepType: 'osquery.getResults',
      });

      await expect(stepDef.handler(context)).rejects.toThrow(ExecutionError);
      await expect(stepDef.handler(context)).rejects.toMatchObject({ type: 'PermissionError' });
    });
  });

  describe('completed action', () => {
    it('should return results with status success when all agents responded', async () => {
      const osqueryContext = createMockOsqueryContext();
      const stepDef = getGetResultsStepDefinition(osqueryContext as any);

      const esSearchMock = jest
        .fn()
        .mockResolvedValueOnce(makeActionHit(['agent-1', 'agent-2']))
        .mockResolvedValueOnce(makeAgentCountResponse(2))
        .mockResolvedValueOnce(
          makeResultHits([
            { name: 'process1', pid: 123 },
            { name: 'process2', pid: 456 },
          ])
        );

      const esCountMock = jest.fn().mockResolvedValue({ count: 2 });

      const context = createStepHandlerContext({
        input: { action_id: 'action-1', max_rows: 1000 },
        stepType: 'osquery.getResults',
        esSearchMock,
        esCountMock,
      });

      const result = await stepDef.handler(context);

      expect(result.output).toEqual({
        rows: [
          { name: 'process1', pid: 123 },
          { name: 'process2', pid: 456 },
        ],
        row_count: 2,
        responded_agents: 2,
        total_agents: 2,
        status: 'success',
      });
    });
  });

  describe('partial results', () => {
    it('should return partial status when not all agents responded', async () => {
      const osqueryContext = createMockOsqueryContext();
      const stepDef = getGetResultsStepDefinition(osqueryContext as any);

      const esSearchMock = jest
        .fn()
        .mockResolvedValueOnce(makeActionHit(['agent-1', 'agent-2', 'agent-3']))
        .mockResolvedValueOnce(makeAgentCountResponse(1))
        .mockResolvedValueOnce({ hits: { hits: [] } });

      const esCountMock = jest.fn().mockResolvedValue({ count: 0 });

      const context = createStepHandlerContext({
        input: { action_id: 'action-1' },
        stepType: 'osquery.getResults',
        esSearchMock,
        esCountMock,
      });

      const result = await stepDef.handler(context);

      expect(result.output?.status).toBe('partial');
      expect(result.output?.responded_agents).toBe(1);
      expect(result.output?.total_agents).toBe(3);
    });
  });

  describe('not found', () => {
    it('should return not_found when action does not exist', async () => {
      const osqueryContext = createMockOsqueryContext();
      const stepDef = getGetResultsStepDefinition(osqueryContext as any);

      const esSearchMock = jest.fn().mockResolvedValueOnce({ hits: { hits: [] } });

      const context = createStepHandlerContext({
        input: { action_id: 'nonexistent' },
        stepType: 'osquery.getResults',
        esSearchMock,
      });

      const result = await stepDef.handler(context);

      expect(result.output?.status).toBe('not_found');
      expect(result.output?.rows).toEqual([]);
    });
  });

  describe('max_rows cap', () => {
    it('should return at most max_rows rows', async () => {
      const osqueryContext = createMockOsqueryContext();
      const stepDef = getGetResultsStepDefinition(osqueryContext as any);

      const rows = Array.from({ length: 5 }, (_, i) => ({ pid: i }));

      const esSearchMock = jest
        .fn()
        .mockResolvedValueOnce(makeActionHit(['agent-1']))
        .mockResolvedValueOnce(makeAgentCountResponse(1))
        .mockResolvedValueOnce(makeResultHits(rows));

      const esCountMock = jest.fn().mockResolvedValue({ count: 100 });

      const context = createStepHandlerContext({
        input: { action_id: 'action-1', max_rows: 5 },
        stepType: 'osquery.getResults',
        esSearchMock,
        esCountMock,
      });

      const result = await stepDef.handler(context);

      expect(result.output?.rows).toHaveLength(5);
      expect(result.output?.row_count).toBe(100);
    });
  });
});
