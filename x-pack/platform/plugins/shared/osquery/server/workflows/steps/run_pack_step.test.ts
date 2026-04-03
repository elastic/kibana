/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRunPackStepDefinition } from './run_pack_step';
import { createStepHandlerContext, createMockActionService } from './test_utils';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

describe('osquery.runPack step', () => {
  const mockActionService = createMockActionService();
  const mockContext = {} as OsqueryAppContext;
  const stepDef = getRunPackStepDefinition(mockActionService as any, mockContext);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('happy path', () => {
    it('should create a pack action and return metadata with query action IDs', async () => {
      mockActionService.create.mockResolvedValue({
        response: {
          action_id: 'pack-action-123',
          agents: ['agent-1'],
          queries: [
            { action_id: 'query-1' },
            { action_id: 'query-2' },
            { action_id: 'query-3' },
          ],
        },
      });

      const context = createStepHandlerContext({
        input: {
          pack_id: 'compliance-pack',
          agent_all: true,
        },
        stepType: 'osquery.runPack',
      });

      const result = await stepDef.handler(context);

      expect(result.output).toEqual({
        action_id: 'pack-action-123',
        total_agents: 1,
        query_action_ids: ['query-1', 'query-2', 'query-3'],
      });
      expect(result.error).toBeUndefined();
    });
  });

  describe('no agent targeting', () => {
    it('should return error when no targeting is provided', async () => {
      const context = createStepHandlerContext({
        input: { pack_id: 'my-pack' },
        stepType: 'osquery.runPack',
      });

      const result = await stepDef.handler(context);

      expect(result.error).toBeDefined();
      expect((result.error as Error).message).toContain('agent targeting');
    });
  });

  describe('pack not found', () => {
    it('should return error when pack does not exist', async () => {
      mockActionService.create.mockRejectedValue(new Error('Saved object not found'));

      const context = createStepHandlerContext({
        input: { pack_id: 'nonexistent', agent_ids: ['agent-1'] },
        stepType: 'osquery.runPack',
      });

      const result = await stepDef.handler(context);

      expect(result.error).toBeDefined();
    });
  });
});
