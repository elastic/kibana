/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  createSavedObjectOwnership,
  readSavedObjectVersions,
  removeSavedObjects,
} from './saved_object_ownership';

describe('saved object ownership', () => {
  const client = savedObjectsClientMock.create();
  const found = (id: string, version?: string, updatedAt?: string) => ({
    type: 'lens',
    id,
    version,
    ...(updatedAt !== undefined && { updated_at: updatedAt }),
  });
  const failed = (id: string, statusCode: number, message = 'failed') => ({
    type: 'lens',
    id,
    error: { statusCode, message },
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('readSavedObjectVersions', () => {
    it('returns the version and update time of each object that exists, without reading attributes', async () => {
      client.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          found('a', 'v1', '2026-01-01T00:00:00.000Z'),
          found('c', 'v2'),
          failed('gone', 404),
          found('b'),
        ],
      } as never);

      const versions = await readSavedObjectVersions({
        client,
        objects: ['a', 'c', 'gone', 'b'].map((id) => ({ type: 'lens', id })),
        shareable: false,
      });

      expect(versions).toEqual([
        { type: 'lens', id: 'a', version: 'v1', updatedAt: '2026-01-01T00:00:00.000Z' },
        { type: 'lens', id: 'c', version: 'v2' },
      ]);
      // An empty list would read every attribute; a name that matches none reads only root fields.
      expect(client.bulkGet).toHaveBeenCalledWith(
        expect.arrayContaining([{ type: 'lens', id: 'a', fields: ['__none'] }])
      );
    });

    it('throws when an object cannot be read, so it does not pass for one that is gone', async () => {
      client.bulkGet.mockResolvedValueOnce({
        saved_objects: [found('a', 'v1'), failed('gone', 404), failed('locked', 403, 'forbidden')],
      } as never);

      await expect(
        readSavedObjectVersions({
          client,
          objects: ['a', 'gone', 'locked'].map((id) => ({ type: 'lens', id })),
          shareable: false,
        })
      ).rejects.toThrow('Could not read lens "locked": forbidden');
    });

    it('looks a shareable object up in every space', async () => {
      client.bulkGet.mockResolvedValueOnce({ saved_objects: [] } as never);

      await readSavedObjectVersions({
        client,
        objects: [{ type: 'lens', id: 'a' }],
        shareable: true,
      });

      expect(client.bulkGet).toHaveBeenCalledWith([
        { type: 'lens', id: 'a', fields: ['__none'], namespaces: ['*'] },
      ]);
    });

    it('does not look anything up for no objects', async () => {
      await expect(
        readSavedObjectVersions({ client, objects: [], shareable: false })
      ).resolves.toEqual([]);
      expect(client.bulkGet).not.toHaveBeenCalled();
    });
  });

  describe('removeSavedObjects', () => {
    it('deletes from every space, counting one already gone as removed by someone else', async () => {
      client.bulkDelete.mockResolvedValueOnce({
        statuses: [
          { type: 'lens', id: 'a', success: true },
          { type: 'lens', id: 'gone', success: false, error: { statusCode: 404, message: 'x' } },
          { type: 'lens', id: 'b', success: false, error: { statusCode: 500, message: 'boom' } },
        ],
      } as never);

      const result = await removeSavedObjects({
        client,
        objects: ['a', 'gone', 'b'].map((id) => ({ type: 'lens', id })),
      });

      expect(result).toEqual({ removed: 1, errors: [{ type: 'lens', id: 'b', message: 'boom' }] });
      expect(client.bulkDelete).toHaveBeenCalledWith(expect.any(Array), { force: true });
    });

    it('does not delete anything for no objects', async () => {
      await removeSavedObjects({ client, objects: [] });

      expect(client.bulkDelete).not.toHaveBeenCalled();
    });
  });

  describe('createSavedObjectOwnership', () => {
    const getClient = jest.fn(async (_spaceId: string) => client);
    const ownership = (shareable = false) =>
      createSavedObjectOwnership({ type: 'lens', shareable, getClient });
    const context = (ids: string[], signal = new AbortController().signal) => ({
      spaceId: 'team-a',
      ids,
      signal,
      logger: loggerMock.create(),
    });

    beforeEach(() => {
      getClient.mockResolvedValue(client);
    });

    it('reads versions by id with the client of the space', async () => {
      client.bulkGet.mockResolvedValueOnce({
        saved_objects: [found('a', 'v1', '2026-01-01T00:00:00.000Z'), failed('gone', 404)],
      } as never);

      await expect(ownership().versions(context(['a', 'gone']))).resolves.toEqual({
        a: { version: 'v1', updatedAt: '2026-01-01T00:00:00.000Z' },
      });
      expect(getClient).toHaveBeenCalledWith('team-a');
    });

    it('reads a shareable type in every space', async () => {
      client.bulkGet.mockResolvedValueOnce({ saved_objects: [] } as never);

      await ownership(true).versions(context(['a']));

      expect(client.bulkGet).toHaveBeenCalledWith([
        { type: 'lens', id: 'a', fields: ['__none'], namespaces: ['*'] },
      ]);
    });

    it('reports removal errors by id', async () => {
      client.bulkDelete.mockResolvedValueOnce({
        statuses: [
          { type: 'lens', id: 'b', success: false, error: { statusCode: 500, message: 'boom' } },
        ],
      } as never);

      await expect(ownership().remove(context(['b']))).resolves.toEqual({
        removed: 0,
        errors: [{ id: 'b', message: 'boom' }],
      });
    });

    describe('removing a shareable type', () => {
      const inSpaces = (id: string, namespaces: string[]) => ({ ...found(id, 'v1'), namespaces });
      const deleted = (...ids: string[]) => ({
        statuses: ids.map((id) => ({ type: 'lens', id, success: true })),
      });

      it('deletes through the space it is owned in while the object is still there', async () => {
        client.bulkGet.mockResolvedValueOnce({
          saved_objects: [inSpaces('a', ['team-a', 'team-b']), inSpaces('b', ['*'])],
        } as never);
        client.bulkDelete.mockResolvedValueOnce(deleted('a', 'b') as never);

        await expect(ownership(true).remove(context(['a', 'b']))).resolves.toEqual({
          removed: 2,
          errors: [],
        });
        expect(getClient).toHaveBeenCalledTimes(1);
        expect(getClient).toHaveBeenCalledWith('team-a');
      });

      it('deletes through a space it is still in once it left the one it is owned in', async () => {
        const otherClient = savedObjectsClientMock.create();
        getClient.mockImplementation(async (spaceId: string) =>
          spaceId === 'team-b' ? otherClient : client
        );
        client.bulkGet.mockResolvedValueOnce({
          saved_objects: [inSpaces('moved', ['team-b', 'team-c']), failed('gone', 404)],
        } as never);
        client.bulkDelete.mockResolvedValueOnce(deleted('gone') as never);
        otherClient.bulkDelete.mockResolvedValueOnce(deleted('moved') as never);

        await expect(ownership(true).remove(context(['moved', 'gone']))).resolves.toEqual({
          removed: 2,
          errors: [],
        });
        expect(otherClient.bulkDelete).toHaveBeenCalledWith([{ type: 'lens', id: 'moved' }], {
          force: true,
        });
        expect(client.bulkDelete).toHaveBeenCalledWith([{ type: 'lens', id: 'gone' }], {
          force: true,
        });
      });

      it('deletes nothing when it cannot tell where the objects are', async () => {
        client.bulkGet.mockResolvedValueOnce({ saved_objects: [failed('a', 500)] } as never);

        await expect(ownership(true).remove(context(['a']))).rejects.toThrow(/Could not read/);
        expect(client.bulkDelete).not.toHaveBeenCalled();
      });
    });

    describe('with a lookup client', () => {
      const lookupClient = savedObjectsClientMock.create();
      const getLookupClient = jest.fn(async () => lookupClient);
      const withLookup = (shareable: boolean) =>
        createSavedObjectOwnership({ type: 'lens', shareable, getClient, getLookupClient });

      beforeEach(() => {
        getLookupClient.mockResolvedValue(lookupClient);
      });

      it('reads a shareable type in every space through the lookup client', async () => {
        lookupClient.bulkGet.mockResolvedValueOnce({
          saved_objects: [found('a', 'v1')],
        } as never);

        await expect(withLookup(true).versions(context(['a']))).resolves.toEqual({
          a: { version: 'v1' },
        });
        expect(lookupClient.bulkGet).toHaveBeenCalledWith([
          { type: 'lens', id: 'a', fields: ['__none'], namespaces: ['*'] },
        ]);
        expect(client.bulkGet).not.toHaveBeenCalled();
      });

      it('finds a shareable type through the lookup client, but deletes through the space', async () => {
        lookupClient.bulkGet.mockResolvedValueOnce({
          saved_objects: [{ ...found('a', 'v1'), namespaces: ['team-a'] }],
        } as never);
        client.bulkDelete.mockResolvedValueOnce({
          statuses: [{ type: 'lens', id: 'a', success: true }],
        } as never);

        await expect(withLookup(true).remove(context(['a']))).resolves.toEqual({
          removed: 1,
          errors: [],
        });
        expect(client.bulkGet).not.toHaveBeenCalled();
        expect(lookupClient.bulkDelete).not.toHaveBeenCalled();
        expect(client.bulkDelete).toHaveBeenCalledWith([{ type: 'lens', id: 'a' }], {
          force: true,
        });
      });

      it('reads a space-isolated type in the space, since it cannot be looked up in every space', async () => {
        client.bulkGet.mockResolvedValueOnce({ saved_objects: [] } as never);

        await withLookup(false).versions(context(['a']));

        expect(client.bulkGet).toHaveBeenCalled();
        expect(getLookupClient).not.toHaveBeenCalled();
      });
    });

    it('does not reach the client when the run is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(ownership().versions(context(['a'], controller.signal))).rejects.toThrow();
      await expect(ownership().remove(context(['a'], controller.signal))).rejects.toThrow();
      expect(getClient).not.toHaveBeenCalled();
    });
  });
});
