/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/public/mocks';
import { asSpaceId } from '@kbn/core-spaces-common';
import { nextTick } from '@kbn/test-jest-helpers';

import { SpacesManager } from './spaces_manager';

describe('SpacesManager', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  describe('#constructor', () => {
    it('does not attempt to retrieve the active space', () => {
      const coreStart = coreMock.createStart();
      new SpacesManager(coreStart.http, logger);
      expect(coreStart.http.get).not.toHaveBeenCalled();
    });
  });

  describe('#getActiveSpace', () => {
    it('attempts to retrieve the active space using the existing get request', async () => {
      const coreStart = coreMock.createStart();
      coreStart.http.get.mockResolvedValue({
        id: 'my-space',
        name: 'my space',
      });
      const spacesManager = new SpacesManager(coreStart.http, logger);
      await spacesManager.getActiveSpace();
      expect(coreStart.http.get).toHaveBeenCalledWith('/internal/spaces/_active_space');

      await nextTick();

      const activeSpace = await spacesManager.getActiveSpace();
      expect(activeSpace).toEqual({
        id: asSpaceId('my-space'),
        name: 'my space',
      });
      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
    });

    it('throws if on an anonymous path', () => {
      const coreStart = coreMock.createStart();
      coreStart.http.anonymousPaths.isAnonymous.mockReturnValue(true);
      const spacesManager = new SpacesManager(coreStart.http, logger);
      expect(coreStart.http.get).not.toHaveBeenCalled();

      expect(() => spacesManager.getActiveSpace()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Cannot retrieve the active space for anonymous paths"`
      );
    });

    it('allows for a force-refresh', async () => {
      const coreStart = coreMock.createStart();
      coreStart.http.get
        .mockResolvedValueOnce({
          id: 'my-space',
          name: 'my space',
        })
        .mockResolvedValueOnce({
          id: 'my-other-space',
          name: 'my other space',
        });

      const spacesManager = new SpacesManager(coreStart.http, logger);

      const activeSpace = await spacesManager.getActiveSpace();
      expect(activeSpace).toEqual({
        id: asSpaceId('my-space'),
        name: 'my space',
      });
      expect(coreStart.http.get).toHaveBeenCalledTimes(1);

      const newActiveSpace = await spacesManager.getActiveSpace({ forceRefresh: true });
      expect(newActiveSpace).toEqual({
        id: asSpaceId('my-other-space'),
        name: 'my other space',
      });
      expect(coreStart.http.get).toHaveBeenCalledTimes(2);
    });

    it('force-refresh still throws for anonymous paths', async () => {
      const coreStart = coreMock.createStart();
      coreStart.http.anonymousPaths.isAnonymous.mockReturnValue(true);
      coreStart.http.get.mockResolvedValueOnce({
        id: asSpaceId('my-space'),
        name: 'my space',
      });

      const spacesManager = new SpacesManager(coreStart.http, logger);

      expect(() =>
        spacesManager.getActiveSpace({ forceRefresh: true })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Cannot retrieve the active space for anonymous paths"`
      );
    });

    describe('when the request fails', () => {
      beforeEach(() => jest.useFakeTimers());
      afterEach(() => jest.useRealTimers());

      it('retries a transient failure before resolving', async () => {
        const coreStart = coreMock.createStart();
        coreStart.http.get
          .mockRejectedValueOnce({ body: { statusCode: 503 } })
          .mockResolvedValueOnce({
            id: 'my-space',
            name: 'my space',
          });
        const spacesManager = new SpacesManager(coreStart.http, logger);

        const activeSpace = expect(spacesManager.getActiveSpace()).resolves.toEqual({
          id: asSpaceId('my-space'),
          name: 'my space',
        });
        await jest.advanceTimersByTimeAsync(500);

        await activeSpace;
        expect(coreStart.http.get).toHaveBeenCalledTimes(2);
      });

      it('gives up once the retries are exhausted', async () => {
        const coreStart = coreMock.createStart();
        coreStart.http.get.mockRejectedValue({ body: { statusCode: 503 } });
        const spacesManager = new SpacesManager(coreStart.http, logger);

        const rejection = expect(spacesManager.getActiveSpace()).rejects.toEqual({
          body: { statusCode: 503 },
        });
        await jest.advanceTimersByTimeAsync(6_000);

        await rejection;
        expect(coreStart.http.get).toHaveBeenCalledTimes(4);
        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining(
            'Failed to retrieve the active space after 4 attempt(s) (status: 503)'
          )
        );
      });

      it('logs the message of a request that never reached the server', async () => {
        const coreStart = coreMock.createStart();
        coreStart.http.get.mockRejectedValue(new Error('Failed to fetch'));
        const spacesManager = new SpacesManager(coreStart.http, logger);

        const rejection = expect(spacesManager.getActiveSpace()).rejects.toThrow('Failed to fetch');
        await jest.advanceTimersByTimeAsync(6_000);

        await rejection;
        expect(coreStart.http.get).toHaveBeenCalledTimes(4);
        expect(logger.error.mock.calls[0][0]).toMatchInlineSnapshot(
          `"Failed to retrieve the active space after 4 attempt(s) (status: no response): Failed to fetch"`
        );
      });

      it('shares one retry sequence across concurrent callers', async () => {
        const coreStart = coreMock.createStart();
        coreStart.http.get.mockRejectedValue({ body: { statusCode: 503 } });
        const spacesManager = new SpacesManager(coreStart.http, logger);

        // Mirrors a page load, where several consumers read the active space before any response lands.
        spacesManager.onActiveSpaceChange$.subscribe(jest.fn());
        spacesManager.onActiveSpaceChange$.subscribe(jest.fn());
        const rejections = Promise.all([
          expect(spacesManager.getActiveSpace()).rejects.toEqual({ body: { statusCode: 503 } }),
          expect(spacesManager.getActiveSpace()).rejects.toEqual({ body: { statusCode: 503 } }),
        ]);
        await jest.advanceTimersByTimeAsync(6_000);

        await rejections;
        expect(coreStart.http.get).toHaveBeenCalledTimes(4);
        expect(logger.error).toHaveBeenCalledTimes(1);
      });

      it('starts a new request after a failed one settles', async () => {
        const coreStart = coreMock.createStart();
        coreStart.http.get
          .mockRejectedValueOnce({ body: { statusCode: 403 } })
          .mockResolvedValueOnce({
            id: 'my-space',
            name: 'my space',
          });
        const spacesManager = new SpacesManager(coreStart.http, logger);

        await expect(spacesManager.getActiveSpace()).rejects.toEqual({
          body: { statusCode: 403 },
        });
        await expect(spacesManager.getActiveSpace()).resolves.toEqual({
          id: asSpaceId('my-space'),
          name: 'my space',
        });
        expect(coreStart.http.get).toHaveBeenCalledTimes(2);
      });

      it('does not retry a client error', async () => {
        const coreStart = coreMock.createStart();
        coreStart.http.get.mockRejectedValue({ body: { statusCode: 403 } });
        const spacesManager = new SpacesManager(coreStart.http, logger);

        await expect(spacesManager.getActiveSpace()).rejects.toEqual({
          body: { statusCode: 403 },
        });
        expect(coreStart.http.get).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledTimes(1);
      });
    });

    it('a force-refresh waits for the pending request and then fetches again', async () => {
      const coreStart = coreMock.createStart();
      let resolveFirst: (space: unknown) => void = () => {};
      coreStart.http.get
        .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
        .mockResolvedValueOnce({ id: 'my-space', name: 'renamed space' });
      const spacesManager = new SpacesManager(coreStart.http, logger);

      const first = spacesManager.getActiveSpace();
      const refreshed = spacesManager.getActiveSpace({ forceRefresh: true });
      await nextTick();
      // The refresh must not overlap the pending request, or an older response could land last.
      expect(coreStart.http.get).toHaveBeenCalledTimes(1);

      resolveFirst({ id: 'my-space', name: 'my space' });
      await expect(first).resolves.toEqual({ id: asSpaceId('my-space'), name: 'my space' });
      await expect(refreshed).resolves.toEqual({
        id: asSpaceId('my-space'),
        name: 'renamed space',
      });
      expect(coreStart.http.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('#onActiveSpaceChange$', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('emits the active space once a transient failure recovers', async () => {
      const coreStart = coreMock.createStart();
      coreStart.http.get
        .mockRejectedValueOnce({ body: { statusCode: 503 } })
        .mockResolvedValueOnce({
          id: 'my-space',
          name: 'my space',
        });
      const spacesManager = new SpacesManager(coreStart.http, logger);

      const onActiveSpace = jest.fn();
      spacesManager.onActiveSpaceChange$.subscribe(onActiveSpace);
      await jest.advanceTimersByTimeAsync(500);

      expect(onActiveSpace).toHaveBeenCalledWith({
        id: asSpaceId('my-space'),
        name: 'my space',
      });
    });
  });

  describe('#getShareSavedObjectPermissions', () => {
    it('retrieves share permissions for the specified type and returns result', async () => {
      const coreStart = coreMock.createStart();
      const shareToAllSpaces = Symbol();
      coreStart.http.get.mockResolvedValue({ shareToAllSpaces });
      const spacesManager = new SpacesManager(coreStart.http, logger);

      const result = await spacesManager.getShareSavedObjectPermissions('foo');
      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
      expect(coreStart.http.get).toHaveBeenLastCalledWith(
        '/internal/security/_share_saved_object_permissions',
        {
          query: { type: 'foo' },
        }
      );
      expect(result).toEqual({ shareToAllSpaces });
    });

    it('allows the share if security is disabled', async () => {
      const coreStart = coreMock.createStart();
      coreStart.http.get.mockRejectedValueOnce({
        body: {
          statusCode: 404,
        },
      });
      const spacesManager = new SpacesManager(coreStart.http, logger);

      const result = await spacesManager.getShareSavedObjectPermissions('foo');
      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
      expect(coreStart.http.get).toHaveBeenLastCalledWith(
        '/internal/security/_share_saved_object_permissions',
        {
          query: { type: 'foo' },
        }
      );
      expect(result).toEqual({ shareToAllSpaces: true });
    });

    it('throws all other errors', async () => {
      const coreStart = coreMock.createStart();
      coreStart.http.get.mockRejectedValueOnce(new Error('Get out of here!'));
      const spacesManager = new SpacesManager(coreStart.http, logger);

      await expect(
        spacesManager.getShareSavedObjectPermissions('foo')
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Get out of here!"`);

      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
      expect(coreStart.http.get).toHaveBeenLastCalledWith(
        '/internal/security/_share_saved_object_permissions',
        {
          query: { type: 'foo' },
        }
      );
    });
  });

  describe('#getShareableReferences', () => {
    it('retrieves the shareable references, filters out references that are tags, and returns the result', async () => {
      const obj1 = { type: 'not-a-tag', id: '1' }; // requested object
      const obj2 = { type: 'tag', id: '2' }; // requested object
      const obj3 = { type: 'tag', id: '3' }; // referenced object
      const obj4 = { type: 'not-a-tag', id: '4' }; // referenced object

      const coreStart = coreMock.createStart();
      coreStart.http.post.mockResolvedValue({ objects: [obj1, obj2, obj3, obj4] }); // A realistic response would include additional fields besides 'type' and 'id', but they are not needed for this test case
      const spacesManager = new SpacesManager(coreStart.http, logger);

      const requestObjects = [obj1, obj2];
      const result = await spacesManager.getShareableReferences(requestObjects);
      expect(coreStart.http.post).toHaveBeenCalledTimes(1);
      expect(coreStart.http.post).toHaveBeenLastCalledWith(
        '/api/spaces/_get_shareable_references',
        { body: JSON.stringify({ objects: requestObjects }) }
      );
      expect(result).toEqual({
        objects: [
          obj1, // obj1 is not a tag
          obj2, // obj2 is a tag, but it was included in the request, so it is not excluded from the response
          // obj3 is a tag, but it was not included in the request, so it is excluded from the response
          obj4, // obj4 is not a tag
        ],
      });
    });
  });

  describe('#getRolesForSpace', () => {
    it('retrieves roles for the specified space', async () => {
      const coreStart = coreMock.createStart();
      const rolesForSpace = [Symbol()];
      coreStart.http.get.mockResolvedValue(rolesForSpace);
      const spacesManager = new SpacesManager(coreStart.http, logger);

      const result = await spacesManager.getRolesForSpace('foo');
      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
      expect(coreStart.http.get).toHaveBeenLastCalledWith('/internal/security/roles/foo');
      expect(result).toEqual(rolesForSpace);
    });

    it('encodes the space id', async () => {
      const coreStart = coreMock.createStart();
      coreStart.http.get.mockResolvedValue([]);
      const spacesManager = new SpacesManager(coreStart.http, logger);

      await spacesManager.getRolesForSpace('foo/bar');
      expect(coreStart.http.get).toHaveBeenLastCalledWith('/internal/security/roles/foo%2Fbar');
    });
  });

  describe('#getContentForSpace', () => {
    it('retrieves content for the specified space', async () => {
      const coreStart = coreMock.createStart();
      const spaceContent = [Symbol()];
      coreStart.http.get.mockResolvedValue({ summary: spaceContent, total: spaceContent.length });
      const spacesManager = new SpacesManager(coreStart.http, logger);

      const result = await spacesManager.getContentForSpace('foo');
      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
      expect(coreStart.http.get).toHaveBeenLastCalledWith('/internal/spaces/foo/content_summary');
      expect(result).toEqual({ summary: spaceContent, total: spaceContent.length });
    });

    it('encodes the space id', async () => {
      const coreStart = coreMock.createStart();
      coreStart.http.get.mockResolvedValue({ summary: [], total: 0 });
      const spacesManager = new SpacesManager(coreStart.http, logger);

      await spacesManager.getContentForSpace('foo/bar');
      expect(coreStart.http.get).toHaveBeenLastCalledWith(
        '/internal/spaces/foo%2Fbar/content_summary'
      );
    });
  });
});
