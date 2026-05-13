/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import type { ITagsCache } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { Tag } from '../../../common/types';
import { createTag, createTagAttributes } from '../../../common/test_utils';
import type { ITagsChangeListener } from './tags_cache';
import { tagsCacheMock } from './tags_cache.mock';
import { TagsClient, type FindTagsOptions } from './tags_client';
import { coreMock } from '@kbn/core/public/mocks';

type TagsClientCache = ITagsCache & ITagsChangeListener;

describe('TagsClient', () => {
  let tagsClient: TagsClient;
  let cache: ReturnType<typeof tagsCacheMock.create>;
  let http: ReturnType<typeof httpServiceMock.createSetupContract>;

  beforeEach(() => {
    http = httpServiceMock.createSetupContract();
    cache = tagsCacheMock.create();
    const { analytics } = coreMock.createStart();
    tagsClient = new TagsClient({
      analytics,
      http,
      cache: cache as unknown as TagsClientCache,
    });
  });

  describe('#create', () => {
    let expectedTag: Tag;

    beforeEach(() => {
      expectedTag = createTag();
      http.post.mockResolvedValue({ tag: expectedTag });
    });

    it('calls `http.post` with the correct parameters', async () => {
      const attributes = createTagAttributes();

      await tagsClient.create(attributes);

      expect(http.post).toHaveBeenCalledTimes(1);
      expect(http.post).toHaveBeenCalledWith('/api/saved_objects_tagging/tags/create', {
        body: JSON.stringify(attributes),
      });
    });
    it('returns the tag object from the response', async () => {
      const tag = await tagsClient.create(createTagAttributes());
      expect(tag).toEqual(expectedTag);
    });
    it('forwards the error from the http call if any', async () => {
      const error = new Error('something when wrong');
      http.post.mockRejectedValue(error);

      await expect(tagsClient.create(createTagAttributes())).rejects.toThrowError(error);
    });
    it('notifies its cache if the http call succeed', async () => {
      await tagsClient.create(createTagAttributes());

      expect(cache.onDidCreate).toHaveBeenCalledTimes(1);
      expect(cache.onDidCreate).toHaveBeenCalledWith(expectedTag);
    });
    it('ignores potential errors when calling `cache.onDidCreate`', async () => {
      cache.onDidCreate.mockImplementation(() => {
        throw new Error('error in onCreate');
      });

      await expect(tagsClient.create(createTagAttributes())).resolves.toBeDefined();
    });
  });

  describe('#update', () => {
    const tagId = 'test-id';
    let expectedTag: Tag;

    beforeEach(() => {
      expectedTag = createTag({ id: tagId });
      http.post.mockResolvedValue({ tag: expectedTag });
    });

    it('calls `http.post` with the correct parameters', async () => {
      const attributes = createTagAttributes();

      await tagsClient.update(tagId, attributes);

      expect(http.post).toHaveBeenCalledTimes(1);
      expect(http.post).toHaveBeenCalledWith(`/api/saved_objects_tagging/tags/${tagId}`, {
        body: JSON.stringify(attributes),
      });
    });
    it('returns the tag object from the response', async () => {
      const tag = await tagsClient.update(tagId, createTagAttributes());
      expect(tag).toEqual(expectedTag);
    });
    it('forwards the error from the http call if any', async () => {
      const error = new Error('something when wrong');
      http.post.mockRejectedValue(error);

      await expect(tagsClient.update(tagId, createTagAttributes())).rejects.toThrowError(error);
    });
    it('notifies its cache if the http call succeed', async () => {
      await tagsClient.update(tagId, createTagAttributes());

      const { id, ...attributes } = expectedTag;
      expect(cache.onDidUpdate).toHaveBeenCalledTimes(1);
      expect(cache.onDidUpdate).toHaveBeenCalledWith(id, attributes);
    });
    it('ignores potential errors when calling `cache.onDidUpdate`', async () => {
      cache.onDidUpdate.mockImplementation(() => {
        throw new Error('error in onUpdate');
      });

      await expect(tagsClient.update(tagId, createTagAttributes())).resolves.toBeDefined();
    });
  });

  describe('#get', () => {
    const tagId = 'test-id';
    let expectedTag: Tag;

    beforeEach(() => {
      expectedTag = createTag({ id: tagId });
      http.get.mockResolvedValue({ tag: expectedTag });
    });

    it('calls `http.get` with the correct parameters', async () => {
      await tagsClient.get(tagId);

      expect(http.get).toHaveBeenCalledTimes(1);
      expect(http.get).toHaveBeenCalledWith(`/api/saved_objects_tagging/tags/${tagId}`);
    });
    it('returns the tag object from the response', async () => {
      const tag = await tagsClient.get(tagId);
      expect(tag).toEqual(expectedTag);
    });
    it('forwards the error from the http call if any', async () => {
      const error = new Error('something when wrong');
      http.get.mockRejectedValue(error);

      await expect(tagsClient.get(tagId)).rejects.toThrowError(error);
    });
  });

  describe('#getAll', () => {
    let expectedTags: Tag[];

    beforeEach(() => {
      expectedTags = [
        createTag({ id: 'tag-1' }),
        createTag({ id: 'tag-2' }),
        createTag({ id: 'tag-3' }),
      ];
      http.get.mockResolvedValue({ tags: expectedTags });
    });

    it('calls `http.get` with the correct parameters', async () => {
      await tagsClient.getAll();

      expect(http.get).toHaveBeenCalledTimes(1);
      expect(http.get).toHaveBeenCalledWith(`/api/saved_objects_tagging/tags`, {
        asSystemRequest: undefined,
      });
    });
    it('allows `asSystemRequest` option to be set', async () => {
      await tagsClient.getAll({ asSystemRequest: true });

      expect(http.get).toHaveBeenCalledTimes(1);
      expect(http.get).toHaveBeenCalledWith(`/api/saved_objects_tagging/tags`, {
        asSystemRequest: true,
      });
    });
    it('returns the tag objects from the response', async () => {
      const tags = await tagsClient.getAll();
      expect(tags).toEqual(expectedTags);
    });
    it('forwards the error from the http call if any', async () => {
      const error = new Error('something when wrong');
      http.get.mockRejectedValue(error);

      await expect(tagsClient.getAll()).rejects.toThrowError(error);
    });
    it('notifies its cache if the http call succeed', async () => {
      await tagsClient.getAll();

      expect(cache.onDidGetAll).toHaveBeenCalledTimes(1);
      expect(cache.onDidGetAll).toHaveBeenCalledWith(expectedTags);
    });
    it('ignores potential errors when calling `cache.onDidGetAll`', async () => {
      cache.onDidGetAll.mockImplementation(() => {
        throw new Error('error in onCreate');
      });

      await expect(tagsClient.getAll()).resolves.toBeDefined();
    });
  });

  describe('#fetchAllFromNetwork', () => {
    let expectedTags: Tag[];

    beforeEach(() => {
      expectedTags = [
        createTag({ id: 'tag-1' }),
        createTag({ id: 'tag-2' }),
        createTag({ id: 'tag-3' }),
      ];
      http.get.mockResolvedValue({ tags: expectedTags });
    });

    it('calls the tags list API and notifies the cache', async () => {
      const tags = await tagsClient.fetchAllFromNetwork({ asSystemRequest: true });

      expect(http.get).toHaveBeenCalledTimes(1);
      expect(http.get).toHaveBeenCalledWith('/api/saved_objects_tagging/tags', {
        asSystemRequest: true,
      });
      expect(cache.onDidGetAll).toHaveBeenCalledTimes(1);
      expect(cache.onDidGetAll).toHaveBeenCalledWith(expectedTags);
      expect(tags).toEqual(expectedTags);
    });
  });

  describe('read-through cache', () => {
    let cacheAndListener: ReturnType<typeof tagsCacheMock.create>;

    beforeEach(() => {
      cacheAndListener = tagsCacheMock.create();
      const { analytics } = coreMock.createStart();
      tagsClient = new TagsClient({
        analytics,
        http,
        cache: cacheAndListener as unknown as TagsClientCache,
      });
    });

    describe('#get', () => {
      it('returns from cache without http when the tag id is present', async () => {
        const tag = createTag({ id: 'cached-id' });
        cacheAndListener.getState.mockReturnValue([tag]);
        const result = await tagsClient.get('cached-id');
        expect(result).toBe(tag);
        expect(http.get).not.toHaveBeenCalled();
      });

      it('fetches via http and notifies onDidCreate when id is not in cache', async () => {
        cacheAndListener.getState.mockReturnValue([]);
        const expectedTag = createTag({ id: 'remote-id' });
        http.get.mockResolvedValue({ tag: expectedTag });
        const result = await tagsClient.get('remote-id');
        expect(http.get).toHaveBeenCalledWith('/api/saved_objects_tagging/tags/remote-id');
        expect(cacheAndListener.onDidCreate).toHaveBeenCalledWith(expectedTag);
        expect(result).toEqual(expectedTag);
      });
    });

    describe('#getAll', () => {
      it('returns a shallow copy of cache state without http when initialized', async () => {
        const tags = [createTag({ id: 'a' })];
        cacheAndListener.isInitialized.mockReturnValue(true);
        cacheAndListener.getState.mockReturnValue(tags);
        const result = await tagsClient.getAll();
        expect(result).toEqual(tags);
        expect(result).not.toBe(tags);
        expect(http.get).not.toHaveBeenCalled();
      });

      it('fetches from network when cache is not initialized', async () => {
        cacheAndListener.isInitialized.mockReturnValue(false);
        const expectedFromNetwork = [createTag({ id: 'n1' })];
        http.get.mockResolvedValue({ tags: expectedFromNetwork });
        const result = await tagsClient.getAll();
        expect(http.get).toHaveBeenCalledTimes(1);
        expect(cacheAndListener.onDidGetAll).toHaveBeenCalledWith(expectedFromNetwork);
        expect(result).toEqual(expectedFromNetwork);
      });
    });

    describe('#findByName', () => {
      it('returns from cache for exact match when initialized', async () => {
        const tag = createTag({ id: 'i1', name: 'Security Solution' });
        cacheAndListener.isInitialized.mockReturnValue(true);
        cacheAndListener.getState.mockReturnValue([tag]);
        const result = await tagsClient.findByName('security solution', { exact: true });
        expect(result).toBe(tag);
        expect(http.get).not.toHaveBeenCalled();
      });

      it('calls find and merges results on exact miss when initialized', async () => {
        cacheAndListener.isInitialized.mockReturnValue(true);
        cacheAndListener.getState.mockReturnValue([]);
        const fromNetwork = {
          ...createTag({ id: 'n1', name: 'Foo' }),
          relationCount: 2,
        };
        http.get.mockResolvedValue({ tags: [fromNetwork], total: 1 });
        const result = await tagsClient.findByName('Foo', { exact: true });
        expect(http.get).toHaveBeenCalledWith('/internal/saved_objects_tagging/tags/_find', {
          query: { page: 1, perPage: 10000, search: 'Foo' },
        });
        expect(cacheAndListener.onDidCreate).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'n1', name: 'Foo' })
        );
        expect(result).toMatchObject({ id: 'n1', name: 'Foo' });
      });
    });
  });

  describe('#delete', () => {
    const tagId = 'id-to-delete';

    beforeEach(() => {
      http.delete.mockResolvedValue({});
    });

    it('calls `http.delete` with the correct parameters', async () => {
      await tagsClient.delete(tagId);

      expect(http.delete).toHaveBeenCalledTimes(1);
      expect(http.delete).toHaveBeenCalledWith(`/api/saved_objects_tagging/tags/${tagId}`);
    });
    it('forwards the error from the http call if any', async () => {
      const error = new Error('something when wrong');
      http.delete.mockRejectedValue(error);

      await expect(tagsClient.delete(tagId)).rejects.toThrowError(error);
    });
    it('notifies its cache if the http call succeed', async () => {
      await tagsClient.delete(tagId);

      expect(cache.onDidDelete).toHaveBeenCalledTimes(1);
      expect(cache.onDidDelete).toHaveBeenCalledWith(tagId);
    });
    it('ignores potential errors when calling `cache.onDidDelete`', async () => {
      cache.onDidDelete.mockImplementation(() => {
        throw new Error('error in onCreate');
      });

      await expect(tagsClient.delete(tagId)).resolves.toBeUndefined();
    });
  });

  describe('internal APIs', () => {
    describe('#find', () => {
      const findOptions: FindTagsOptions = {
        search: 'for, you know.',
      };
      let expectedTags: Tag[];

      beforeEach(() => {
        expectedTags = [
          createTag({ id: 'tag-1' }),
          createTag({ id: 'tag-2' }),
          createTag({ id: 'tag-3' }),
        ];
        http.get.mockResolvedValue({ tags: expectedTags, total: expectedTags.length });
      });

      it('calls `http.get` with the correct parameters', async () => {
        await tagsClient.find(findOptions);

        expect(http.get).toHaveBeenCalledTimes(1);
        expect(http.get).toHaveBeenCalledWith(`/internal/saved_objects_tagging/tags/_find`, {
          query: findOptions,
        });
      });
      it('returns the tag objects from the response', async () => {
        const { tags, total } = await tagsClient.find(findOptions);
        expect(tags).toEqual(expectedTags);
        expect(total).toEqual(3);
      });
      it('forwards the error from the http call if any', async () => {
        const error = new Error('something when wrong');
        http.get.mockRejectedValue(error);

        await expect(tagsClient.find(findOptions)).rejects.toThrowError(error);
      });
    });

    describe('#bulkDelete', () => {
      const tagIds = ['id-to-delete-1', 'id-to-delete-2'];

      beforeEach(() => {
        http.post.mockResolvedValue({});
      });

      it('calls `http.post` with the correct parameters', async () => {
        await tagsClient.bulkDelete(tagIds);

        expect(http.post).toHaveBeenCalledTimes(1);
        expect(http.post).toHaveBeenCalledWith(
          `/internal/saved_objects_tagging/tags/_bulk_delete`,
          {
            body: JSON.stringify({
              ids: tagIds,
            }),
          }
        );
      });
      it('forwards the error from the http call if any', async () => {
        const error = new Error('something when wrong');
        http.post.mockRejectedValue(error);

        await expect(tagsClient.bulkDelete(tagIds)).rejects.toThrowError(error);
      });
      it('notifies its cache if the http call succeed', async () => {
        await tagsClient.bulkDelete(tagIds);

        expect(cache.onDidDelete).toHaveBeenCalledTimes(2);
        expect(cache.onDidDelete).toHaveBeenCalledWith(tagIds[0]);
        expect(cache.onDidDelete).toHaveBeenCalledWith(tagIds[1]);
      });
      it('ignores potential errors when calling `cache.onDidDelete`', async () => {
        cache.onDidDelete.mockImplementation(() => {
          throw new Error('error in onCreate');
        });

        await expect(tagsClient.bulkDelete(tagIds)).resolves.toBeUndefined();
      });
    });
  });
});
