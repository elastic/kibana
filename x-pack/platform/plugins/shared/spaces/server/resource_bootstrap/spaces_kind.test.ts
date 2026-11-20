/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { savedObjectsClientMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { createSpacesKind, SPACE_KIND_ID } from './spaces_kind';
import { ConfigSchema } from '../config';
import { SpacesClient } from '../spaces_client';

const space = { id: 'team-a', name: 'Team A', disabledFeatures: [] };

describe('spaces kind', () => {
  const client = {
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const savedObjectsClient = savedObjectsClientMock.create();
  const getSavedObjectsClient = async () => savedObjectsClient;

  const buildKind = (isServerless = false) =>
    createSpacesKind({ isServerless, getSpacesClient: async () => client, getSavedObjectsClient });

  const contextOf = <T>(resources: T[], signal = new AbortController().signal) => ({
    spaceId: 'default',
    spaces: [],
    resources,
    declared: resources,
    managed: true,
    signal,
    logger: loggerMock.create(),
  });

  const apply = (resources: Array<typeof space>, isServerless = false) =>
    buildKind(isServerless).apply(contextOf(resources));

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('is global, so it is applied before every isolated kind, and is owned but never pruned', () => {
    const kind = buildKind();

    expect(kind.id).toBe(SPACE_KIND_ID);
    expect(kind.spaces).toBe('none');
    expect(kind.ownership?.versions).toEqual(expect.any(Function));
    expect(kind.ownership?.remove).toBeUndefined();
  });

  it('reads the stored version of each space that exists, and leaves out the missing ones', async () => {
    savedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        {
          type: 'space',
          id: 'team-a',
          version: 'WzEsMV0=',
          updated_at: '2026-11-01T00:00:00.000Z',
          attributes: {},
          references: [],
        },
        {
          type: 'space',
          id: 'team-b',
          attributes: {},
          references: [],
          error: { statusCode: 404, error: 'Not Found', message: 'Not found' },
        },
      ],
    });

    const versions = await buildKind().ownership?.versions({
      spaceId: '*',
      ids: ['team-a', 'team-b'],
      signal: new AbortController().signal,
      logger: loggerMock.create(),
    });

    expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith([
      expect.objectContaining({ type: 'space', id: 'team-a' }),
      expect.objectContaining({ type: 'space', id: 'team-b' }),
    ]);
    expect(versions).toEqual({
      'team-a': { version: 'WzEsMV0=', updatedAt: '2026-11-01T00:00:00.000Z' },
    });
  });

  it('creates a space that does not exist', async () => {
    client.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError('space', 'x'));

    const result = await apply([space]);

    expect(client.create).toHaveBeenCalledWith(space);
    expect(client.update).not.toHaveBeenCalled();
    expect(result).toEqual({ applied: 1, errors: [] });
  });

  it('runs onCreated with each created space, as the create API does, but not after an update', async () => {
    const onCreated = jest.fn(async () => {});
    const kind = createSpacesKind({
      isServerless: false,
      getSpacesClient: async () => client,
      getSavedObjectsClient,
      onCreated,
    });
    client.get
      .mockRejectedValueOnce(SavedObjectsErrorHelpers.createGenericNotFoundError('space', 'x'))
      .mockResolvedValueOnce(space);
    client.create.mockImplementation(async (created) => ({ ...created, solution: 'oblt' }));

    const result = await kind.apply(contextOf([space, { ...space, id: 'team-b' }]));

    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(onCreated).toHaveBeenCalledWith({ ...space, solution: 'oblt' });
    expect(result.applied).toBe(2);
  });

  it('reports a space whose seeding failed as failed', async () => {
    const kind = createSpacesKind({
      isServerless: false,
      getSpacesClient: async () => client,
      getSavedObjectsClient,
      onCreated: async () => {
        throw new Error('seeding failed');
      },
    });
    client.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError('space', 'x'));

    const result = await kind.apply(contextOf([space]));

    expect(result).toEqual({
      applied: 0,
      errors: [{ id: 'team-a', message: 'seeding failed' }],
    });
  });

  it('updates a space that already exists', async () => {
    client.get.mockResolvedValue(space);

    const result = await apply([space]);

    expect(client.update).toHaveBeenCalledWith('team-a', space);
    expect(client.create).not.toHaveBeenCalled();
    expect(result.applied).toBe(1);
  });

  it('reports a space the client rejects as permanent and carries on with the rest', async () => {
    client.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError('space', 'x'));
    client.create.mockRejectedValueOnce(
      Boom.badRequest('Unable to create Space, this exceeds the maximum number of spaces')
    );

    const result = await apply([space, { ...space, id: 'team-b' }]);

    expect(result.applied).toBe(1);
    expect(result.errors).toEqual([
      {
        id: 'team-a',
        message: 'Unable to create Space, this exceeds the maximum number of spaces',
        permanent: true,
      },
    ]);
    expect(client.create).toHaveBeenCalledTimes(2);
  });

  it('does not treat a failure to look the space up as "missing", so it is not overwritten', async () => {
    client.get.mockRejectedValue(new Error('elasticsearch is down'));

    const result = await apply([space]);

    expect(client.create).not.toHaveBeenCalled();
    expect(client.update).not.toHaveBeenCalled();
    expect(result.errors).toEqual([{ id: 'team-a', message: 'elasticsearch is down' }]);
  });

  describe('spaceExists', () => {
    it('finds a space through the spaces client', async () => {
      client.get.mockResolvedValue(space);

      await expect(buildKind().spaceExists?.('team-a')).resolves.toBe(true);
      expect(client.get).toHaveBeenCalledWith('team-a');
    });

    it('says a space the client does not find does not exist', async () => {
      client.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError('space', 'x')
      );

      await expect(buildKind().spaceExists?.('typo')).resolves.toBe(false);
    });

    it('throws when the space cannot be looked up', async () => {
      client.get.mockRejectedValue(new Error('elasticsearch is down'));

      await expect(buildKind().spaceExists?.('team-a')).rejects.toThrow('elasticsearch is down');
    });
  });

  describe('schema', () => {
    const { parse } = buildKind();

    it('accepts what the spaces API accepts, defaulting disabledFeatures', () => {
      expect(parse({ id: 'team-a', name: 'Team A' })).toEqual({
        id: 'team-a',
        name: 'Team A',
        disabledFeatures: [],
      });
    });

    it('rejects ids the spaces API rejects', () => {
      expect(() => parse({ id: 'Team A', name: 'x' })).toThrow(/lower case/);
    });

    it('requires a name', () => {
      expect(() => parse({ id: 'team-a', name: '' })).toThrow();
    });

    it('accepts a solution outside serverless and rejects it in serverless', () => {
      expect(buildKind(false).parse({ ...space, solution: 'es' })).toEqual(
        expect.objectContaining({ solution: 'es' })
      );
      expect(() => buildKind(true).parse({ ...space, solution: 'es' })).toThrow();
    });
  });

  // The spaces client updates only the attributes it is given, so the files do not decide every
  // field of a space that exists; the README documents this under Kinds.
  describe('with the real spaces client, updating a space that exists', () => {
    const repository = savedObjectsRepositoryMock.create();
    const features = featuresPluginMock.createStart();
    features.getKibanaFeatures.mockReturnValue([]);
    const realClient = new SpacesClient(
      () => {},
      ConfigSchema.validate({}, { serverless: false }),
      repository,
      [],
      'traditional',
      features,
      undefined
    );
    const kind = createSpacesKind({
      isServerless: false,
      getSpacesClient: async () => realClient,
      getSavedObjectsClient,
    });

    const applyOver = async (
      stored: Record<string, unknown>,
      declared: Record<string, unknown>
    ) => {
      repository.get.mockResolvedValue({
        id: 'team-a',
        type: 'space',
        references: [],
        attributes: { name: 'Team A', disabledFeatures: [], ...stored },
      });
      const result = await kind.apply({
        ...contextOf([kind.parse({ id: 'team-a', name: 'Team A', ...declared })]),
        spaceId: '*',
      });
      expect(result.errors).toEqual([]);
      const [[, , attributes]] = repository.update.mock.calls;
      return attributes as Record<string, unknown>;
    };

    beforeEach(() => {
      // The outer `resetAllMocks` clears what the client reads features from.
      features.getKibanaFeatures.mockReturnValue([]);
    });

    it('keeps optional fields that the declaration leaves out, so they are not cleared', async () => {
      const attributes = await applyOver(
        { description: 'set by hand', color: '#ff0000', initials: 'TA', imageUrl: 'data:x' },
        {}
      );

      // `undefined` is left out of the partial update, so the stored values stay.
      expect(attributes.description).toBeUndefined();
      expect(attributes.color).toBeUndefined();
      expect(attributes.initials).toBeUndefined();
      expect(attributes.imageUrl).toBeUndefined();
    });

    it('keeps the stored solution when the declaration names none', async () => {
      const attributes = await applyOver({ solution: 'oblt' }, {});

      expect(attributes).not.toHaveProperty('solution');
    });

    it('keeps the stored disabledFeatures of a space with a non-classic solution', async () => {
      const attributes = await applyOver(
        { solution: 'oblt', disabledFeatures: ['set_by_hand'] },
        { disabledFeatures: [] }
      );

      expect(attributes.disabledFeatures).toEqual(['set_by_hand']);
    });
  });

  describe('when the run is aborted', () => {
    it('stops before the next space and lets the abort through, not reporting it as a failure', async () => {
      const controller = new AbortController();
      client.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError('space', 'x')
      );
      client.create.mockImplementationOnce(async () => controller.abort());

      await expect(
        buildKind().apply(contextOf([space, { ...space, id: 'team-b' }], controller.signal))
      ).rejects.toThrow();

      expect(client.create).toHaveBeenCalledTimes(1);
    });
  });
});
