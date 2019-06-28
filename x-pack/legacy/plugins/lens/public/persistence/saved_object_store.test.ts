/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectIndexStore } from './saved_object_store';

describe('LensStore', () => {
  function testStore(testId?: string) {
    const client = {
      create: jest.fn(() => Promise.resolve({ id: testId || 'testid' })),
      update: jest.fn((_type: string, id: string) => Promise.resolve({ id })),
      get: jest.fn(),
    };

    return {
      client,
      store: new SavedObjectIndexStore(client),
    };
  }

  describe('save', () => {
    test('creates and returns a visualization document', async () => {
      const { client, store } = testStore('FOO');
      const doc = await store.save({
        title: 'Hello',
        visualizationType: 'bar',
        datasourceType: 'indexpattern',
        state: {
          datasource: { type: 'index_pattern', indexPattern: '.kibana_test' },
          visualization: { x: 'foo', y: 'baz' },
        },
      });

      expect(doc).toEqual({
        id: 'FOO',
        title: 'Hello',
        visualizationType: 'bar',
        datasourceType: 'indexpattern',
        state: {
          datasource: { type: 'index_pattern', indexPattern: '.kibana_test' },
          visualization: { x: 'foo', y: 'baz' },
        },
      });

      expect(client.create).toHaveBeenCalledTimes(1);
      expect(client.create).toHaveBeenCalledWith('lens', {
        datasourceType: 'indexpattern',
        title: 'Hello',
        visualizationType: 'bar',
        state: JSON.stringify({
          datasource: { type: 'index_pattern', indexPattern: '.kibana_test' },
          visualization: { x: 'foo', y: 'baz' },
        }),
      });
    });

    test('updates and returns a visualization document', async () => {
      const { client, store } = testStore();
      const doc = await store.save({
        id: 'Gandalf',
        title: 'Even the very wise cannot see all ends.',
        visualizationType: 'line',
        datasourceType: 'indexpattern',
        state: {
          datasource: { type: 'index_pattern', indexPattern: 'lotr' },
          visualization: { gear: ['staff', 'pointy hat'] },
        },
      });

      expect(doc).toEqual({
        id: 'Gandalf',
        title: 'Even the very wise cannot see all ends.',
        visualizationType: 'line',
        datasourceType: 'indexpattern',
        state: {
          datasource: { type: 'index_pattern', indexPattern: 'lotr' },
          visualization: { gear: ['staff', 'pointy hat'] },
        },
      });

      expect(client.update).toHaveBeenCalledTimes(1);
      expect(client.update).toHaveBeenCalledWith('lens', 'Gandalf', {
        title: 'Even the very wise cannot see all ends.',
        visualizationType: 'line',
        datasourceType: 'indexpattern',
        state: JSON.stringify({
          datasource: { type: 'index_pattern', indexPattern: 'lotr' },
          visualization: { gear: ['staff', 'pointy hat'] },
        }),
      });
    });
  });

  describe('load', () => {
    test('parses the visState', async () => {
      const { client, store } = testStore();
      client.get = jest.fn(async () => ({
        id: 'Paul',
        type: 'lens',
        attributes: {
          title: 'Hope clouds observation.',
          visualizationType: 'dune',
          state: '{ "datasource": { "giantWorms": true } }',
        },
      }));
      const doc = await store.load('Paul');

      expect(doc).toEqual({
        id: 'Paul',
        type: 'lens',
        title: 'Hope clouds observation.',
        visualizationType: 'dune',
        state: {
          datasource: { giantWorms: true },
        },
      });

      expect(client.get).toHaveBeenCalledTimes(1);
      expect(client.get).toHaveBeenCalledWith('lens', 'Paul');
    });

    test('throws if an error is returned', async () => {
      const { client, store } = testStore();
      client.get = jest.fn(async () => ({
        id: 'Paul',
        type: 'lens',
        attributes: {
          title: 'Hope clouds observation.',
          visualizationType: 'dune',
          state: '{ "datasource": { "giantWorms": true } }',
        },
        error: new Error('shoot dang!'),
      }));

      await expect(store.load('Paul')).rejects.toThrow('shoot dang!');
    });
  });
});
