/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { CUSTOM_APP_STATE_VERSION } from '@kbn/custom-app-common';
import { CUSTOM_APP_SAVED_OBJECT_TYPE } from '../../common/constants';
import { createSavedAppsService } from './saved_apps_service';

const input = {
  title: 'Explorer',
  description: 'About',
  document: {
    state: {},
    root: { type: 'heading' as const, id: 'title', text: 'Hi' },
  },
};

const stored = { ...input, version: CUSTOM_APP_STATE_VERSION };

const object = (id = 'app-1', updatedAt = '2026-10-16T10:00:00.000Z') => ({
  id,
  type: CUSTOM_APP_SAVED_OBJECT_TYPE,
  attributes: stored,
  references: [],
  updated_at: updatedAt,
});

describe('the saved apps service', () => {
  const client = savedObjectsClientMock.create();
  const service = createSavedAppsService(client);

  beforeEach(() => jest.resetAllMocks());

  it('creates an app with the version of its format, and returns it with its id', async () => {
    client.create.mockResolvedValue(object());

    const app = await service.create(input);

    expect(client.create).toHaveBeenCalledWith(CUSTOM_APP_SAVED_OBJECT_TYPE, stored);
    expect(app).toEqual({ id: 'app-1', ...stored, updatedAt: '2026-10-16T10:00:00.000Z' });
  });

  it('leaves out a description that was not given, instead of storing an empty one', async () => {
    client.create.mockResolvedValue(object());

    await service.create({ title: input.title, document: input.document });

    expect(client.create.mock.calls[0][1]).not.toHaveProperty('description');
  });

  it('gets an app by id', async () => {
    client.get.mockResolvedValue(object('app-7'));

    expect((await service.get('app-7')).id).toBe('app-7');
    expect(client.get).toHaveBeenCalledWith(CUSTOM_APP_SAVED_OBJECT_TYPE, 'app-7');
  });

  it('updates an app and answers with what is stored', async () => {
    client.update.mockResolvedValue({} as never);
    client.get.mockResolvedValue(object('app-1', '2026-10-17T10:00:00.000Z'));

    const app = await service.update('app-1', input);

    expect(client.update).toHaveBeenCalledWith(CUSTOM_APP_SAVED_OBJECT_TYPE, 'app-1', stored);
    expect(app.updatedAt).toBe('2026-10-17T10:00:00.000Z');
  });

  it('removes an app', async () => {
    client.delete.mockResolvedValue({});

    await service.remove('app-1');

    expect(client.delete).toHaveBeenCalledWith(CUSTOM_APP_SAVED_OBJECT_TYPE, 'app-1');
  });

  describe('finding apps', () => {
    const found = (objects = [object()]) => ({
      saved_objects: objects.map((o) => ({ ...o, score: 1 })),
      total: objects.length,
      page: 1,
      per_page: 20,
    });

    it('lists the newest first, with only what a list shows and no documents', async () => {
      client.find.mockResolvedValue(found());

      const result = await service.find({ page: 1, perPage: 20 });

      expect(client.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: CUSTOM_APP_SAVED_OBJECT_TYPE,
          sortField: 'updated_at',
          sortOrder: 'desc',
          fields: ['title', 'description'],
        })
      );
      expect(result).toEqual({
        apps: [
          {
            id: 'app-1',
            title: 'Explorer',
            description: 'About',
            updatedAt: '2026-10-16T10:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        perPage: 20,
      });
      expect(JSON.stringify(result)).not.toContain('document');
    });

    it('searches titles by prefix, and does not search at all without a term', async () => {
      client.find.mockResolvedValue(found());

      await service.find({ search: 'serv', page: 1, perPage: 20 });
      expect(client.find).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'serv*', searchFields: ['title'] })
      );

      await service.find({ page: 1, perPage: 20 });
      expect(client.find.mock.calls[1][0]).not.toHaveProperty('search');
    });
  });
});
