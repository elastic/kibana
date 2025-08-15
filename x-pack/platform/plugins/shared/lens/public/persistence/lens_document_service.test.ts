/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import { LensDocumentService } from './lens_document_service';

describe('LensStore', () => {
  function testStore(testId?: string) {
    const client = {
      create: jest.fn(() => Promise.resolve({ item: { id: testId || 'testid' } })),
      update: jest.fn(() => Promise.resolve({ item: { id: testId || 'testid' } })),
      get: jest.fn(),
    };

    return {
      client,
      service: new LensDocumentService({
        client,
        registry: jest.fn(),
      } as unknown as ContentManagementPublicStart),
    };
  }

  describe('save', () => {
    test('creates and returns a visualization document', async () => {
      const { client, service } = testStore('FOO');
      const doc = await service.save({
        title: 'Hello',
        description: 'My doc',
        visualizationType: 'bar',
        references: [],
        state: {
          datasourceStates: {
            indexpattern: { type: 'index_pattern', indexPattern: '.kibana_test' },
          },
          visualization: { x: 'foo', y: 'baz' },
          query: { query: '', language: 'lucene' },
          filters: [],
        },
      });

      expect(doc).toEqual({
        savedObjectId: 'FOO',
        title: 'Hello',
        description: 'My doc',
        visualizationType: 'bar',
        references: [],
        state: {
          datasourceStates: {
            indexpattern: { type: 'index_pattern', indexPattern: '.kibana_test' },
          },
          visualization: { x: 'foo', y: 'baz' },
          query: { query: '', language: 'lucene' },
          filters: [],
        },
      });

      expect(client.create).toHaveBeenCalledTimes(1);
      expect(client.create).toHaveBeenCalledWith({
        contentTypeId: 'lens',
        data: {
          title: 'Hello',
          description: 'My doc',
          visualizationType: 'bar',
          state: {
            datasourceStates: {
              indexpattern: { type: 'index_pattern', indexPattern: '.kibana_test' },
            },
            visualization: { x: 'foo', y: 'baz' },
            query: { query: '', language: 'lucene' },
            filters: [],
          },
        },
        options: {
          references: [],
        },
      });
    });

    test('updates and returns a visualization document', async () => {
      const { client, service } = testStore('Gandalf');
      const doc = await service.save({
        savedObjectId: 'Gandalf',
        title: 'Even the very wise cannot see all ends.',
        visualizationType: 'line',
        references: [],
        state: {
          datasourceStates: { indexpattern: { type: 'index_pattern', indexPattern: 'lotr' } },
          visualization: { gear: ['staff', 'pointy hat'] },
          query: { query: '', language: 'lucene' },
          filters: [],
        },
      });

      expect(doc).toEqual({
        savedObjectId: 'Gandalf',
        title: 'Even the very wise cannot see all ends.',
        visualizationType: 'line',
        references: [],
        state: {
          datasourceStates: { indexpattern: { type: 'index_pattern', indexPattern: 'lotr' } },
          visualization: { gear: ['staff', 'pointy hat'] },
          query: { query: '', language: 'lucene' },
          filters: [],
        },
      });

      expect(client.update).toHaveBeenCalledTimes(1);
      expect(client.update.mock.calls).toEqual([
        [
          {
            contentTypeId: 'lens',
            id: 'Gandalf',
            data: {
              title: 'Even the very wise cannot see all ends.',
              visualizationType: 'line',
              state: {
                datasourceStates: { indexpattern: { type: 'index_pattern', indexPattern: 'lotr' } },
                visualization: { gear: ['staff', 'pointy hat'] },
                query: { query: '', language: 'lucene' },
                filters: [],
              },
            },
            options: { references: [] },
          },
        ],
      ]);
    });
  });

  describe('load', () => {
    test('throws if an error is returned', async () => {
      const { client, service } = testStore();
      client.get = jest.fn(async () => ({
        meta: { outcome: 'exactMatch' },
        item: {
          id: 'Paul',
          type: 'lens',
          attributes: {
            title: 'Hope clouds observation.',
            visualizationType: 'dune',
            state: '{ "datasource": { "giantWorms": true } }',
          },
          error: new Error('shoot dang!'),
        },
      }));

      await expect(service.load('Paul')).rejects.toThrow('shoot dang!');
    });
  });
});
