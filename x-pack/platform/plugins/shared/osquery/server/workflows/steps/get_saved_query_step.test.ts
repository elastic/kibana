/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { getGetSavedQueryStepDefinition } from './get_saved_query_step';
import {
  createStepHandlerContext,
  createMockActionService,
  createMockOsqueryContext,
} from './test_utils';

const RESOLVED_QUERY = {
  savedObjectId: 'sq-so-id',
  query: 'SELECT * FROM processes',
  description: 'List all processes',
  platform: 'linux,darwin',
  ecsMapping: { 'process.name': { field: 'name' } },
  timeout: 300,
};

describe('osquery.getSavedQuery step', () => {
  const mockActionService = createMockActionService();

  beforeEach(() => {
    jest.clearAllMocks();
    mockActionService.resolveSavedQueryByName.mockResolvedValue(RESOLVED_QUERY);
  });

  describe('authorization', () => {
    it('should throw PermissionError when author lacks readLiveQueries', async () => {
      const osqueryContext = createMockOsqueryContext({ readLiveQueries: false });
      const stepDef = getGetSavedQueryStepDefinition(
        mockActionService as any,
        osqueryContext as any
      );

      const context = createStepHandlerContext({
        input: { saved_query_id: 'query-123' },
        stepType: 'osquery.getSavedQuery',
      });

      await expect(stepDef.handler(context)).rejects.toThrow(ExecutionError);
      await expect(stepDef.handler(context)).rejects.toMatchObject({ type: 'PermissionError' });
      expect(mockActionService.resolveSavedQueryByName).not.toHaveBeenCalled();
    });
  });

  describe('found', () => {
    it('should return saved query definition', async () => {
      const osqueryContext = createMockOsqueryContext();
      const stepDef = getGetSavedQueryStepDefinition(
        mockActionService as any,
        osqueryContext as any
      );

      const context = createStepHandlerContext({
        input: { saved_query_id: 'query-123' },
        stepType: 'osquery.getSavedQuery',
      });

      const result = await stepDef.handler(context);

      expect(result.output).toEqual({
        id: 'query-123',
        query: 'SELECT * FROM processes',
        description: 'List all processes',
        platform: 'linux,darwin',
        ecs_mapping: { 'process.name': { field: 'name' } },
        interval: 300,
      });
      expect(result.error).toBeUndefined();
    });
  });

  describe('not found', () => {
    it('should throw NotFoundError when saved query does not exist', async () => {
      const osqueryContext = createMockOsqueryContext();
      mockActionService.resolveSavedQueryByName.mockRejectedValue(
        new Error('Saved object not found')
      );
      const stepDef = getGetSavedQueryStepDefinition(
        mockActionService as any,
        osqueryContext as any
      );

      const context = createStepHandlerContext({
        input: { saved_query_id: 'nonexistent' },
        stepType: 'osquery.getSavedQuery',
      });

      await expect(stepDef.handler(context)).rejects.toMatchObject({ type: 'NotFoundError' });
    });
  });
});
