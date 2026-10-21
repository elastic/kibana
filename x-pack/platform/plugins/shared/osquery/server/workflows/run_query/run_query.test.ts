/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { deriveRunQueryStatus } from './status';
import { toRunQueryRow } from './rows';
import { runQueryStepDefinition } from './run_query_step';

type PollContext = Parameters<typeof runQueryStepDefinition.poll>[0];

describe('osquery run query step', () => {
  describe('deriveRunQueryStatus', () => {
    const c = (responded: number, pending: number, failed: number, successful: number) => ({
      responded,
      pending,
      failed,
      successful,
    });

    it('should return timed_out when the deadline passes with no responses', () => {
      expect(deriveRunQueryStatus(c(0, 1, 0, 0), true)).toBe('timed_out');
    });

    it('should return failed when the deadline passes with no successful response', () => {
      expect(deriveRunQueryStatus(c(1, 1, 1, 0), true)).toBe('failed');
    });

    it('should return partial when the deadline passes with some success', () => {
      expect(deriveRunQueryStatus(c(1, 1, 0, 1), true)).toBe('partial');
    });

    it('should return success when nothing is pending or failed', () => {
      expect(deriveRunQueryStatus(c(2, 0, 0, 2), false)).toBe('success');
    });

    it('should return failed when nothing is pending and nothing succeeded', () => {
      expect(deriveRunQueryStatus(c(1, 0, 1, 0), false)).toBe('failed');
    });

    it('should return partial when nothing is pending but some failed', () => {
      expect(deriveRunQueryStatus(c(2, 0, 1, 1), false)).toBe('partial');
    });

    it('should keep polling while agents are pending before the deadline', () => {
      expect(deriveRunQueryStatus(c(1, 1, 0, 1), false)).toBeUndefined();
    });
  });

  describe('toRunQueryRow', () => {
    it('should stringify columns and tag the agent', () => {
      const row = toRunQueryRow(
        {
          '@timestamp': '2026-10-14T10:00:00Z',
          agent: { id: 'a1', name: 'host-1' },
          osquery: { pid: 42, name: 'bash' },
        },
        []
      );
      expect(row).toEqual({
        agent: { id: 'a1', name: 'host-1' },
        '@timestamp': '2026-10-14T10:00:00Z',
        columns: { pid: '42', name: 'bash' },
        ecs: {},
      });
    });

    it('should read ecs values from the mapping keys, nested or flat', () => {
      const row = toRunQueryRow(
        {
          agent: { id: 'a1' },
          osquery: { name: 'bash' },
          process: { name: 'bash' },
          'host.name': 'h',
        },
        ['process.name', 'host.name', 'missing.field']
      );
      expect(row.ecs).toEqual({ 'process.name': 'bash', 'host.name': 'h' });
    });

    it('should handle flattened osquery.* keys', () => {
      const row = toRunQueryRow({ 'agent.id': 'a1', 'osquery.pid': 7 }, []);
      expect(row.agent.id).toBe('a1');
      expect(row.columns).toEqual({ pid: '7' });
    });
  });

  describe('poll', () => {
    const state = {
      action_id: 'action-1',
      query_action_id: 'query-1',
      deadline: new Date(Date.now() + 60_000).toISOString(),
      ecs_keys: [],
      max_rows: 10,
      agents_total: 2,
    };

    const buildContext = (callKibanaApi: jest.Mock) =>
      ({
        state,
        contextManager: { callKibanaApi },
        logger: { warn: jest.fn() },
      } as unknown as PollContext);

    const apiError = (status: number) =>
      new KibanaApiCallError({ status, headers: {}, body: {}, message: `HTTP ${status}` });

    it('should fail with STATUS_UNREADABLE_FORBIDDEN when the details read returns 403', async () => {
      const result = await runQueryStepDefinition.poll(
        buildContext(jest.fn().mockRejectedValue(apiError(403)))
      );

      expect(result).toEqual({
        output: {
          status: 'failed',
          error_code: 'STATUS_UNREADABLE_FORBIDDEN',
          action_id: 'action-1',
          agents: { total: 2, responded: 0, pending: 2, failed: 0 },
          rows: [],
          row_count: 0,
          truncated: false,
        },
      });
    });

    it('should keep polling when the details read returns 5xx before the deadline', async () => {
      const result = await runQueryStepDefinition.poll(
        buildContext(jest.fn().mockRejectedValue(apiError(503)))
      );

      expect(result).toEqual({ state });
    });
  });
});
