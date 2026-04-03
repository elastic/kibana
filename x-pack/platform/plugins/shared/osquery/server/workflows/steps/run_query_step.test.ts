/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRunQueryStepDefinition } from './run_query_step';
import { createStepHandlerContext, createMockActionService } from './test_utils';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

describe('osquery.runQuery step', () => {
  const mockActionService = createMockActionService();
  const mockContext = {} as OsqueryAppContext;
  const stepDef = getRunQueryStepDefinition(mockActionService as any, mockContext);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('happy path', () => {
    it('should create an action and return metadata', async () => {
      mockActionService.create.mockResolvedValue({
        response: {
          action_id: 'action-123',
          agents: ['agent-1', 'agent-2'],
          queries: [{ action_id: 'query-action-1' }],
        },
      });

      const context = createStepHandlerContext({
        input: {
          saved_query_id: 'my-saved-query',
          agent_ids: ['agent-1', 'agent-2'],
        },
        stepType: 'osquery.runQuery',
      });

      const result = await stepDef.handler(context);

      expect(result.output).toEqual({
        action_id: 'action-123',
        total_agents: 2,
        query_action_id: 'query-action-1',
      });
      expect(result.error).toBeUndefined();
      expect(mockActionService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          saved_query_id: 'my-saved-query',
          agent_ids: ['agent-1', 'agent-2'],
          metadata: { source: 'workflows' },
        }),
        expect.objectContaining({
          space: { id: 'default' },
        })
      );
    });
  });

  describe('no agent targeting', () => {
    it('should return error when no targeting is provided', async () => {
      const context = createStepHandlerContext({
        input: { saved_query_id: 'my-query' },
        stepType: 'osquery.runQuery',
      });

      const result = await stepDef.handler(context);

      expect(result.error).toBeDefined();
      expect((result.error as Error).message).toContain('agent targeting');
      expect(mockActionService.create).not.toHaveBeenCalled();
    });
  });

  describe('action service error', () => {
    it('should return error when action service fails', async () => {
      mockActionService.create.mockRejectedValue(new Error('License not valid'));

      const context = createStepHandlerContext({
        input: {
          saved_query_id: 'my-query',
          agent_ids: ['agent-1'],
        },
        stepType: 'osquery.runQuery',
      });

      const result = await stepDef.handler(context);

      expect(result.error).toBeDefined();
      expect((result.error as Error).message).toBe('License not valid');
    });
  });
});
