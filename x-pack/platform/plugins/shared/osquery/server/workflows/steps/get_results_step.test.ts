/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGetResultsStepDefinition } from './get_results_step';
import { createStepHandlerContext } from './test_utils';

describe('osquery.getResults step', () => {
  const stepDef = getGetResultsStepDefinition();

  describe('completed action', () => {
    it('should return results with status success when all agents responded', async () => {
      const esSearchMock = jest
        .fn()
        // First call: action lookup
        .mockResolvedValueOnce({
          hits: {
            hits: [
              { _source: { action_id: 'action-1', agents: ['agent-1', 'agent-2'] } },
            ],
          },
        })
        // Second call: agent count
        .mockResolvedValueOnce({
          aggregations: { unique_agents: { value: 2 } },
        })
        // Third call: result rows
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  action_response: { osquery: { name: 'process1', pid: 123 } },
                },
                sort: ['2024-01-01', 'id1'],
              },
              {
                _source: {
                  action_response: { osquery: { name: 'process2', pid: 456 } },
                },
                sort: ['2024-01-01', 'id2'],
              },
            ],
          },
        });

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
      const esSearchMock = jest
        .fn()
        .mockResolvedValueOnce({
          hits: {
            hits: [
              { _source: { agents: ['agent-1', 'agent-2', 'agent-3'] } },
            ],
          },
        })
        .mockResolvedValueOnce({
          aggregations: { unique_agents: { value: 1 } },
        })
        .mockResolvedValueOnce({
          hits: { hits: [] },
        });

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
      const esSearchMock = jest.fn().mockResolvedValueOnce({
        hits: { hits: [] },
      });

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
});
