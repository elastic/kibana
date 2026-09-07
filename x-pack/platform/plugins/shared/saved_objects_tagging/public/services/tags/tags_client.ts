/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPath } from '@kbn/core-http-browser';
import type { HttpSetup, AnalyticsServiceStart } from '@kbn/core/public';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import type { ITagsCache } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type {
  Tag,
  TagAttributes,
  GetAllTagsOptions,
  ITagsClient,
  TagWithRelations,
} from '../../../common/types';
import type { ITagsChangeListener } from './tags_cache';

const BULK_DELETE_TAG_EVENT = 'bulkDeleteTag';
const CREATE_TAG_EVENT = 'createTag';
const DELETE_TAG_EVENT = 'deleteTag';
const GET_ALL_TAGS_EVENT = 'getAllTag';
const FIND_TAG_EVENT = 'findTag';
const UPDATE_TAG_EVENT = 'updateTag';

export interface TagsClientOptions {
  analytics: AnalyticsServiceStart;
  http: HttpSetup;
  /** When set, read APIs consult this cache before calling the network. */
  cache?: ITagsCache & ITagsChangeListener;
}

export interface FindTagsOptions {
  page?: number;
  perPage?: number;
  search?: string;
}

export interface FindTagsResponse {
  tags: TagWithRelations[];
  total: number;
}

const trapErrors = (fn: () => void) => {
  try {
    fn();
  } catch (e) {
    // trap
  }
};

export interface ITagInternalClient extends ITagsClient {
  find(options: FindTagsOptions): Promise<FindTagsResponse>;
  bulkDelete(ids: string[]): Promise<void>;
}

export class TagsClient implements ITagInternalClient {
  private readonly analytics: AnalyticsServiceStart;
  private readonly http: HttpSetup;
  private readonly cache?: ITagsCache & ITagsChangeListener;

  constructor({ analytics, http, cache }: TagsClientOptions) {
    this.analytics = analytics;
    this.http = http;
    this.cache = cache;
  }

  // public APIs from ITagsClient

  public async create(attributes: TagAttributes) {
    const startTime = window.performance.now();
    const { tag } = await this.http.post<{ tag: Tag }>('/api/saved_objects_tagging/tags/create', {
      body: JSON.stringify(attributes),
    });
    const duration = window.performance.now() - startTime;
    reportPerformanceMetricEvent(this.analytics, {
      eventName: CREATE_TAG_EVENT,
      duration,
    });

    trapErrors(() => {
      if (this.cache) {
        this.cache.onDidCreate(tag);
      }
    });

    return tag;
  }

  public async update(id: string, attributes: TagAttributes) {
    const startTime = window.performance.now();
    const { tag } = await this.http.post<{ tag: Tag }>(
      buildPath('/api/saved_objects_tagging/tags/{id}', { id }),
      {
        body: JSON.stringify(attributes),
      }
    );
    const duration = window.performance.now() - startTime;
    reportPerformanceMetricEvent(this.analytics, {
      eventName: UPDATE_TAG_EVENT,
      duration,
    });

    trapErrors(() => {
      if (this.cache) {
        const { id: newId, ...newAttributes } = tag;
        this.cache.onDidUpdate(newId, newAttributes);
      }
    });

    return tag;
  }

  public async get(id: string) {
    const cached = (this.cache?.getState() ?? []).find((t) => t.id === id);
    if (cached) {
      return cached;
    }

    const { tag } = await this.http.get<{ tag: Tag }>(
      buildPath('/api/saved_objects_tagging/tags/{id}', { id })
    );

    trapErrors(() => {
      if (this.cache) {
        this.cache.onDidCreate(tag);
      }
    });

    return tag;
  }

  /**
   * Loads all tags from the server, updates the change listener / cache, and returns the list.
   * Used by {@link TagsCache} refresh so periodic reloads always hit the network.
   */
  public async fetchAllFromNetwork({ asSystemRequest }: GetAllTagsOptions = {}): Promise<Tag[]> {
    const startTime = window.performance.now();
    const fetchOptions = { asSystemRequest };
    const { tags } = await this.http.get<{ tags: Tag[] }>(
      '/api/saved_objects_tagging/tags',
      fetchOptions
    );
    const duration = window.performance.now() - startTime;
    reportPerformanceMetricEvent(this.analytics, {
      eventName: GET_ALL_TAGS_EVENT,
      duration,
    });

    trapErrors(() => {
      if (this.cache) {
        this.cache.onDidGetAll(tags);
      }
    });

    return tags;
  }

  public async getAll(options: GetAllTagsOptions = {}) {
    if (this.cache?.isInitialized()) {
      return [...this.cache.getState()];
    }
    return this.fetchAllFromNetwork(options);
  }

  public async delete(id: string) {
    const startTime = window.performance.now();
    await this.http.delete<{}>(buildPath('/api/saved_objects_tagging/tags/{id}', { id }));
    const duration = window.performance.now() - startTime;
    reportPerformanceMetricEvent(this.analytics, {
      eventName: DELETE_TAG_EVENT,
      duration,
    });

    trapErrors(() => {
      if (this.cache) {
        this.cache.onDidDelete(id);
      }
    });
  }

  // internal APIs from ITagInternalClient

  public async find({ page, perPage, search }: FindTagsOptions) {
    const startTime = window.performance.now();
    const response = await this.http.get<FindTagsResponse>(
      '/internal/saved_objects_tagging/tags/_find',
      {
        query: {
          page,
          perPage,
          search,
        },
      }
    );
    const duration = window.performance.now() - startTime;
    reportPerformanceMetricEvent(this.analytics, {
      eventName: FIND_TAG_EVENT,
      duration,
    });

    return response;
  }

  public async findByName(name: string, { exact }: { exact?: boolean } = { exact: false }) {
    if (exact && this.cache?.isInitialized()) {
      const cached = this.cache
        .getState()
        .find((t) => t.name.toLocaleLowerCase() === name.toLocaleLowerCase());
      if (cached) {
        return cached;
      }
    }

    const { tags = [] } = await this.find({ page: 1, perPage: 10000, search: name });

    if (tags.length > 0) {
      this.mergeFindResultsIntoCache(tags);
    }

    if (exact) {
      return tags.find((t) => t.name.toLocaleLowerCase() === name.toLocaleLowerCase()) ?? null;
    }
    return tags.length > 0 ? tags[0] : null;
  }

  private mergeFindResultsIntoCache(tags: TagWithRelations[]) {
    for (const t of tags) {
      const { relationCount: _relationCount, ...plain } = t;
      trapErrors(() => {
        if (this.cache) {
          this.cache.onDidCreate(plain as Tag);
        }
      });
    }
  }

  public async bulkDelete(tagIds: string[]) {
    const startTime = window.performance.now();
    await this.http.post<{}>('/internal/saved_objects_tagging/tags/_bulk_delete', {
      body: JSON.stringify({
        ids: tagIds,
      }),
    });
    const duration = window.performance.now() - startTime;
    reportPerformanceMetricEvent(this.analytics, {
      eventName: BULK_DELETE_TAG_EVENT,
      duration,
    });

    trapErrors(() => {
      if (this.cache) {
        tagIds.forEach((tagId) => {
          this.cache!.onDidDelete(tagId);
        });
      }
    });
  }
}
