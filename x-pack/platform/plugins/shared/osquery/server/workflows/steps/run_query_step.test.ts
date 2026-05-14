/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { getRunQueryStepDefinition } from './run_query_step';
import {
  createStepHandlerContext,
  createMockActionService,
  createMockOsqueryContext,
} from './test_utils';

const RESOLVED_QUERY = {
  savedObjectId: 'sq-so-id',
  query: 'SELECT * FROM processes',
  ecsMapping: {},
  timeout: 60,
  description: 'Test query',
  platform: 'linux',
};

describe('osquery.runQuery step', () => {
  const mockActionService = createMockActionService();

  beforeEach(() => {
    jest.clearAllMocks();
    mockActionService.resolveSavedQueryByName.mockResolvedValue(RESOLVED_QUERY);
    mockActionService.create.mockResolvedValue({
      response: {
        action_id: 'action-123',
        agents: ['agent-1', 'agent-2'],
        queries: [{ action_id: 'query-action-1' }],
      },
    });
  });

  describe('happy path', () => {
    it('should create an action and return metadata', async () => {
      const osqueryContext = createMockOsqueryContext();
      const stepDef = getRunQueryStepDefinition(mockActionService as any, osqueryContext as any);

      const context = createStepHandlerContext({
        input: { saved_query_id: 'my-saved-query', agent_ids: ['agent-1', 'agent-2'] },
        stepType: 'osquery.runQuery',
        workflowId: 'wf-001',
        executionId: 'exec-001',
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
          saved_query_id: 'sq-so-id',
          agent_ids: ['agent-1', 'agent-2'],
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

    it('should allow author with runSavedQueries + saved_query_id (no writeLiveQueries)', async () => {
      const osqueryContext = createMockOsqueryContext({
        writeLiveQueries: false,
        runSavedQueries: true,
      });
      const stepDef = getRunQueryStepDefinition(mockActionService as any, osqueryContext as any);

      const context = createStepHandlerContext({
        input: { saved_query_id: 'my-saved-query', agent_ids: ['agent-1'] },
        stepType: 'osquery.runQuery',
      });

      const result = await stepDef.handler(context);

      expect(result.output).toBeDefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe('authorization', () => {
    it('should throw PermissionError when author has neither writeLiveQueries nor runSavedQueries', async () => {
      const osqueryContext = createMockOsqueryContext({
        writeLiveQueries: false,
        runSavedQueries: false,
      });
      const stepDef = getRunQueryStepDefinition(mockActionService as any, osqueryContext as any);

      const context = createStepHandlerContext({
        input: { saved_query_id: 'my-saved-query', agent_ids: ['agent-1'] },
        stepType: 'osquery.runQuery',
      });

      await expect(stepDef.handler(context)).rejects.toThrow(ExecutionError);
      await expect(stepDef.handler(context)).rejects.toMatchObject({
        type: 'PermissionError',
      });
      expect(mockActionService.create).not.toHaveBeenCalled();
    });
  });

  describe('audit identity', () => {
    it('should populate currentUser and userProfileUid in metadata', async () => {
      const osqueryContext = createMockOsqueryContext({
        username: 'analyst@elastic.co',
        profileUid: 'uid-analyst',
      });
      const stepDef = getRunQueryStepDefinition(mockActionService as any, osqueryContext as any);

      const context = createStepHandlerContext({
        input: { saved_query_id: 'my-saved-query', agent_all: true },
        stepType: 'osquery.runQuery',
        workflowId: 'wf-abc',
        executionId: 'exec-xyz',
      });

      await stepDef.handler(context);

      expect(mockActionService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            source: 'workflows',
            workflow_id: 'wf-abc',
            execution_id: 'exec-xyz',
            currentUser: 'analyst@elastic.co',
            userProfileUid: 'uid-analyst',
          },
        }),
        expect.anything()
      );
    });

    it('should set currentUser undefined when security is unavailable', async () => {
      const osqueryContext = createMockOsqueryContext();
      // Override security to simulate it being unavailable
      (osqueryContext as any).security = undefined;
      const stepDef = getRunQueryStepDefinition(mockActionService as any, osqueryContext as any);

      const context = createStepHandlerContext({
        input: { saved_query_id: 'my-saved-query', agent_all: true },
        stepType: 'osquery.runQuery',
      });

      await stepDef.handler(context);

      expect(mockActionService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            currentUser: undefined,
            userProfileUid: undefined,
          }),
        }),
        expect.anything()
      );
    });
  });

  describe('validation', () => {
    it('should throw ValidationError when no agent targeting is provided', async () => {
      const osqueryContext = createMockOsqueryContext();
      const stepDef = getRunQueryStepDefinition(mockActionService as any, osqueryContext as any);

      const context = createStepHandlerContext({
        input: { saved_query_id: 'my-query' },
        stepType: 'osquery.runQuery',
      });

      await expect(stepDef.handler(context)).rejects.toMatchObject({
        type: 'ValidationError',
      });
      expect(mockActionService.create).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw NotFoundError when saved query does not exist', async () => {
      const osqueryContext = createMockOsqueryContext();
      mockActionService.resolveSavedQueryByName.mockRejectedValue(
        new Error('Saved object not found')
      );
      const stepDef = getRunQueryStepDefinition(mockActionService as any, osqueryContext as any);

      const context = createStepHandlerContext({
        input: { saved_query_id: 'missing-query', agent_ids: ['agent-1'] },
        stepType: 'osquery.runQuery',
      });

      await expect(stepDef.handler(context)).rejects.toMatchObject({
        type: 'NotFoundError',
      });
    });

    it('should throw LicenseError when license is insufficient', async () => {
      const osqueryContext = createMockOsqueryContext();
      mockActionService.create.mockRejectedValue(new Error('License not valid for osquery'));
      const stepDef = getRunQueryStepDefinition(mockActionService as any, osqueryContext as any);

      const context = createStepHandlerContext({
        input: { saved_query_id: 'my-query', agent_ids: ['agent-1'] },
        stepType: 'osquery.runQuery',
      });

      await expect(stepDef.handler(context)).rejects.toMatchObject({
        type: 'LicenseError',
      });
    });

    it('should throw RuntimeError for generic failures', async () => {
      const osqueryContext = createMockOsqueryContext();
      mockActionService.create.mockRejectedValue(new Error('Unexpected ES failure'));
      const stepDef = getRunQueryStepDefinition(mockActionService as any, osqueryContext as any);

      const context = createStepHandlerContext({
        input: { saved_query_id: 'my-query', agent_ids: ['agent-1'] },
        stepType: 'osquery.runQuery',
      });

      await expect(stepDef.handler(context)).rejects.toMatchObject({
        type: 'RuntimeError',
      });
    });
  });
});
