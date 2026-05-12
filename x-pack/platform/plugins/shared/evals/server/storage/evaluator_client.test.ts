/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { EvaluatorClient } from './evaluator_client';
import { EVALUATOR_SAVED_OBJECT_TYPE } from './evaluator_storage';
import type { CustomEvaluatorAttributes } from './evaluator_storage';

describe('EvaluatorClient', () => {
  const soClient = savedObjectsClientMock.create();
  const client = new EvaluatorClient(soClient);

  const now = '2026-03-01T00:00:00.000Z';

  const attrs: CustomEvaluatorAttributes = {
    name: 'test-evaluator',
    kind: 'CODE',
    type: 'code',
    description: 'A test evaluator',
    config: { function_body: 'return 1;' },
    version: 1,
    tags: {},
    shared: false,
    created_at: now,
    updated_at: now,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a saved object with correct type and id', async () => {
      soClient.create.mockResolvedValueOnce({
        id: attrs.name,
        type: EVALUATOR_SAVED_OBJECT_TYPE,
        attributes: attrs,
        references: [],
      });

      const result = await client.create(attrs);

      expect(soClient.create).toHaveBeenCalledWith(EVALUATOR_SAVED_OBJECT_TYPE, attrs, {
        id: attrs.name,
      });
      expect(result.id).toBe(attrs.name);
      expect(result.attributes.name).toBe('test-evaluator');
    });
  });

  describe('get', () => {
    it('retrieves a saved object by id', async () => {
      soClient.get.mockResolvedValueOnce({
        id: attrs.name,
        type: EVALUATOR_SAVED_OBJECT_TYPE,
        attributes: attrs,
        references: [],
      });

      const result = await client.get(attrs.name);

      expect(soClient.get).toHaveBeenCalledWith(EVALUATOR_SAVED_OBJECT_TYPE, attrs.name);
      expect(result.attributes.description).toBe('A test evaluator');
    });
  });

  describe('find', () => {
    it('finds all evaluators', async () => {
      soClient.find.mockResolvedValueOnce({
        total: 1,
        saved_objects: [
          {
            id: attrs.name,
            type: EVALUATOR_SAVED_OBJECT_TYPE,
            attributes: attrs,
            references: [],
            score: 1,
          },
        ],
        per_page: 1000,
        page: 1,
      });

      const result = await client.find();

      expect(soClient.find).toHaveBeenCalledWith({
        type: EVALUATOR_SAVED_OBJECT_TYPE,
        perPage: 1000,
        filter: undefined,
      });
      expect(result.total).toBe(1);
    });

    it('filters by shared flag', async () => {
      soClient.find.mockResolvedValueOnce({
        total: 0,
        saved_objects: [],
        per_page: 1000,
        page: 1,
      });

      await client.find({ shared: true });

      expect(soClient.find).toHaveBeenCalledWith({
        type: EVALUATOR_SAVED_OBJECT_TYPE,
        perPage: 1000,
        filter: `${EVALUATOR_SAVED_OBJECT_TYPE}.attributes.shared: true`,
      });
    });
  });

  describe('update', () => {
    it('updates and returns the updated object', async () => {
      soClient.update.mockResolvedValueOnce({
        id: attrs.name,
        type: EVALUATOR_SAVED_OBJECT_TYPE,
        attributes: { ...attrs, description: 'Updated' },
        references: [],
      });
      soClient.get.mockResolvedValueOnce({
        id: attrs.name,
        type: EVALUATOR_SAVED_OBJECT_TYPE,
        attributes: { ...attrs, description: 'Updated' },
        references: [],
      });

      const result = await client.update(attrs.name, { description: 'Updated' });

      expect(soClient.update).toHaveBeenCalledWith(EVALUATOR_SAVED_OBJECT_TYPE, attrs.name, {
        description: 'Updated',
      });
      expect(result.attributes.description).toBe('Updated');
    });
  });

  describe('delete', () => {
    it('deletes the saved object', async () => {
      soClient.delete.mockResolvedValueOnce({});

      await client.delete(attrs.name);

      expect(soClient.delete).toHaveBeenCalledWith(EVALUATOR_SAVED_OBJECT_TYPE, attrs.name);
    });
  });
});
