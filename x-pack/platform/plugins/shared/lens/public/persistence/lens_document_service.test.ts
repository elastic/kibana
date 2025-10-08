/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';

import { LENS_ITEM_LATEST_VERSION } from '../../common/constants';
import { LensClient } from './lens_client';
import { LensDocumentService } from './lens_document_service';
import type { LensDocument } from './types';

jest.mock('./lens_client', () => {
  const mockClient = {
    create: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    search: jest.fn(),
  };
  return {
    LensClient: jest.fn(() => mockClient),
  };
});

const startMock = coreMock.createStart();

describe('LensStore', () => {
  function testStore() {
    const httpMock = startMock.http;
    return {
      client: new LensClient(httpMock), // mock client
      service: new LensDocumentService(httpMock),
    };
  }

  describe('save', () => {
    test('creates and returns a Lens document', async () => {
      const { client, service } = testStore();
      const docToSave: LensDocument = {
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
        version: LENS_ITEM_LATEST_VERSION,
      };

      jest.mocked(client.create).mockImplementation(async (item, references) => ({
        item: {
          id: 'new-id',
          ...item,
          references,
          extraProp: 'test',
          visualizationType: item.visualizationType ?? 'lnsXY',
        },
        meta: { type: 'lens' },
      }));
      const doc = await service.save(docToSave);

      expect(doc).toEqual({ savedObjectId: 'new-id' });

      expect(client.create).toHaveBeenCalledTimes(1);
      const { references, ...attributes } = docToSave;
      expect(client.create).toHaveBeenCalledWith(attributes, references);
    });

    test('updates and returns a Lens document', async () => {
      const { client, service } = testStore();
      const docToUpdate: LensDocument = {
        savedObjectId: 'update-id',
        title: 'Even the very wise cannot see all ends.',
        visualizationType: 'line',
        references: [],
        state: {
          datasourceStates: { indexpattern: { type: 'index_pattern', indexPattern: 'lotr' } },
          visualization: { gear: ['staff', 'pointy hat'] },
          query: { query: '', language: 'lucene' },
          filters: [],
        },
        version: LENS_ITEM_LATEST_VERSION,
      };

      jest.mocked(client.update).mockImplementation(async (id, item, references) => ({
        item: {
          id,
          ...item,
          references,
          extraProp: 'test',
          visualizationType: item.visualizationType ?? 'lnsXY',
        },
        meta: { type: 'lens' },
      }));

      const doc = await service.save(docToUpdate);
      // should replace doc with response properties
      expect(doc).toEqual({ savedObjectId: 'update-id' });

      expect(client.update).toHaveBeenCalledTimes(1);
      const { savedObjectId, references, ...attributes } = docToUpdate;
      expect(client.update).toHaveBeenCalledWith(savedObjectId, attributes, references);
    });
  });

  describe('load', () => {
    test('throws if an error is returned', async () => {
      const { client, service } = testStore();
      jest.mocked(client.get).mockRejectedValue(new Error('shoot dang!'));

      await expect(service.load('123')).rejects.toThrow('shoot dang!');
    });
  });
});
