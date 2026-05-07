/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { getRunPackStepDefinition } from './run_pack_step';
import {
  createStepHandlerContext,
  createMockActionService,
  createMockOsqueryContext,
} from './test_utils';

const RESOLVED_PACK = { savedObjectId: 'pack-so-id' };

describe('osquery.runPack step', () => {
  const mockActionService = createMockActionService();

  beforeEach(() => {
    jest.clearAllMocks();
    mockActionService.resolvePackByName.mockResolvedValue(RESOLVED_PACK);
    mockActionService.create.mockResolvedValue({
      response: {
        action_id: 'pack-action-123',
        agents: ['agent-1'],
        queries: [{ action_id: 'query-1' }, { action_id: 'query-2' }, { action_id: 'query-3' }],
      },
    });
  });

  describe('happy path', () => {
    it('should create a pack action and return metadata with query action IDs', async () => {
      const osqueryContext = createMockOsqueryContext();
      const stepDef = getRunPackStepDefinition(mockActionService as any, osqueryContext as any);

      const context = createStepHandlerContext({
        input: { pack_id: 'compliance-pack', agent_all: true },
        stepType: 'osquery.runPack',
        workflowId: 'wf-001',
        executionId: 'exec-001',
      });

      const result = await stepDef.handler(context);

      expect(result.output).toEqual(
        expect.objectContaining({
          action_id: 'pack-action-123',
          total_agents: 1,
          query_action_ids: ['query-1', 'query-2', 'query-3'],
        })
      );
      expect(result.error).toBeUndefined();
      expect(mockActionService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          pack_id: 'pack-so-id',
          metadata: expect.objectContaining({
            source: 'workflows',
            workflow_id: 'wf-001',
            execution_id: 'exec-001',
            currentUser: 'test-user',
            userProfileUid: 'profile-uid-123',
          }),
        }),
        expect.objectContaining({ space: { id: 'default' } })
      );
    });

    it('should allow author with runSavedQueries + pack_id (no writeLiveQueries)', async () => {
      const osqueryContext = createMockOsqueryContext({
        writeLiveQueries: false,
        runSavedQueries: true,
      });
      const stepDef = getRunPackStepDefinition(mockActionService as any, osqueryContext as any);

      const context = createStepHandlerContext({
        input: { pack_id: 'compliance-pack', agent_all: true },
        stepType: 'osquery.runPack',
      });

      const result = await stepDef.handler(context);

      expect(result.output).toBeDefined();
    });
  });

  describe('authorization', () => {
    it('should throw PermissionError when author lacks write/saved-query capabilities', async () => {
      const osqueryContext = createMockOsqueryContext({
        writeLiveQueries: false,
        runSavedQueries: false,
      });
      const stepDef = getRunPackStepDefinition(mockActionService as any, osqueryContext as any);

      const context = createStepHandlerContext({
        input: { pack_id: 'my-pack', agent_all: true },
        stepType: 'osquery.runPack',
      });

      await expect(stepDef.handler(context)).rejects.toThrow(ExecutionError);
      await expect(stepDef.handler(context)).rejects.toMatchObject({
        type: 'PermissionError',
      });
      expect(mockActionService.create).not.toHaveBeenCalled();
    });
  });

  describe('audit identity', () => {
    it('should populate workflow_id and execution_id in metadata', async () => {
      const osqueryContext = createMockOsqueryContext({ username: 'soc@elastic.co' });
      const stepDef = getRunPackStepDefinition(mockActionService as any, osqueryContext as any);

      const context = createStepHandlerContext({
        input: { pack_id: 'compliance-pack', agent_all: true },
        stepType: 'osquery.runPack',
        workflowId: 'wf-pack-1',
        executionId: 'exec-pack-1',
      });

      await stepDef.handler(context);

      expect(mockActionService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            workflow_id: 'wf-pack-1',
            execution_id: 'exec-pack-1',
            currentUser: 'soc@elastic.co',
          }),
        }),
        expect.anything()
      );
    });
  });

  describe('validation', () => {
    it('should throw ValidationError when no agent targeting is provided', async () => {
      const osqueryContext = createMockOsqueryContext();
      const stepDef = getRunPackStepDefinition(mockActionService as any, osqueryContext as any);

      const context = createStepHandlerContext({
        input: { pack_id: 'my-pack' },
        stepType: 'osquery.runPack',
      });

      await expect(stepDef.handler(context)).rejects.toMatchObject({
        type: 'ValidationError',
      });
    });
  });

  describe('error handling', () => {
    it('should throw NotFoundError when pack does not exist', async () => {
      const osqueryContext = createMockOsqueryContext();
      mockActionService.resolvePackByName.mockRejectedValue(new Error('Saved object not found'));
      const stepDef = getRunPackStepDefinition(mockActionService as any, osqueryContext as any);

      const context = createStepHandlerContext({
        input: { pack_id: 'nonexistent', agent_ids: ['agent-1'] },
        stepType: 'osquery.runPack',
      });

      await expect(stepDef.handler(context)).rejects.toMatchObject({
        type: 'NotFoundError',
      });
    });

    it('should throw LicenseError when license is insufficient', async () => {
      const osqueryContext = createMockOsqueryContext();
      mockActionService.create.mockRejectedValue(new Error('License not valid for osquery'));
      const stepDef = getRunPackStepDefinition(mockActionService as any, osqueryContext as any);

      const context = createStepHandlerContext({
        input: { pack_id: 'my-pack', agent_ids: ['agent-1'] },
        stepType: 'osquery.runPack',
      });

      await expect(stepDef.handler(context)).rejects.toMatchObject({
        type: 'LicenseError',
      });
    });
  });
});
