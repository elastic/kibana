/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGetSavedQueryStepDefinition } from './get_saved_query_step';
import { createStepHandlerContext } from './test_utils';

describe('osquery.getSavedQuery step', () => {
  const stepDef = getGetSavedQueryStepDefinition();

  describe('found', () => {
    it('should return saved query definition', async () => {
      const esSearchMock = jest.fn().mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                'osquery-saved-query': {
                  query: 'SELECT * FROM processes',
                  description: 'List all processes',
                  platform: 'linux,darwin',
                  ecs_mapping: { 'process.name': { field: 'name' } },
                  interval: 300,
                },
              },
            },
          ],
        },
      });

      const context = createStepHandlerContext({
        input: { saved_query_id: 'query-123' },
        stepType: 'osquery.getSavedQuery',
        esSearchMock,
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
    it('should return error when saved query does not exist', async () => {
      const esSearchMock = jest.fn().mockResolvedValue({
        hits: { hits: [] },
      });

      const context = createStepHandlerContext({
        input: { saved_query_id: 'nonexistent' },
        stepType: 'osquery.getSavedQuery',
        esSearchMock,
      });

      const result = await stepDef.handler(context);

      expect(result.error).toBeDefined();
      expect((result.error as Error).message).toContain('not found');
    });
  });
});
