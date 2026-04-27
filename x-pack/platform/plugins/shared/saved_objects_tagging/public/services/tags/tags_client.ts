/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup, AnalyticsServiceStart } from '@kbn/core/public';
import { buildPath } from '@kbn/core-http-browser';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import type {
  Tag,
  TagAttributes,
  GetAllTagsOptions,
  ITagsClient,
  TagWithRelations,
} from '../../../common/types';
import { TAGS_API_PATH, TAGS_API_VERSION } from '../../../common/api_constants';
import type { TagResponseItem, TagsListResponseBody } from '../../../server/routes/api/schemas';
import type { ITagsChangeListener } from './tags_cache';

const BULK_DELETE_TAG_EVENT = 'bulkDeleteTag';
const CREATE_TAG_EVENT = 'createTag';
const DELETE_TAG_EVENT = 'deleteTag';
const GET_ALL_TAGS_EVENT = 'getAllTag';
const FIND_TAG_EVENT = 'findTag';
const UPDATE_TAG_EVENT = 'updateTag';

const buildTagPath = (id: string) => buildPath(`${TAGS_API_PATH}/{id}`, { id });

const toTag = ({ id, data, meta }: TagResponseItem): Tag => {
  return {
    id,
    managed: meta.managed ?? false,
    ...data,
  };
};

export interface TagsClientOptions {
  analytics: AnalyticsServiceStart;
  http: HttpSetup;
  changeListener?: ITagsChangeListener;
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
  private readonly changeListener?: ITagsChangeListener;

  constructor({ analytics, http, changeListener }: TagsClientOptions) {
    this.analytics = analytics;
    this.http = http;
    this.changeListener = changeListener;
  }

  // public APIs from ITagsClient

  public async create(attributes: TagAttributes) {
    const startTime = window.performance.now();
    const response = await this.http.post<TagResponseItem>(TAGS_API_PATH, {
      version: TAGS_API_VERSION,
      body: JSON.stringify(attributes),
    });
    const tag = toTag(response);
    const duration = window.performance.now() - startTime;
    reportPerformanceMetricEvent(this.analytics, {
      eventName: CREATE_TAG_EVENT,
      duration,
    });

    trapErrors(() => {
      if (this.changeListener) {
        this.changeListener.onCreate(tag);
      }
    });

    return tag;
  }

  public async update(id: string, attributes: TagAttributes) {
    const startTime = window.performance.now();
    const response = await this.http.put<TagResponseItem>(buildTagPath(id), {
      version: TAGS_API_VERSION,
      body: JSON.stringify(attributes),
    });
    const tag = toTag(response);
    const duration = window.performance.now() - startTime;
    reportPerformanceMetricEvent(this.analytics, {
      eventName: UPDATE_TAG_EVENT,
      duration,
    });

    trapErrors(() => {
      if (this.changeListener) {
        const { id: newId, ...newAttributes } = tag;
        this.changeListener.onUpdate(newId, newAttributes);
      }
    });

    return tag;
  }

  public async get(id: string) {
    const response = await this.http.get<TagResponseItem>(buildTagPath(id), {
      version: TAGS_API_VERSION,
    });
    return toTag(response);
  }

  public async getAll({ asSystemRequest }: GetAllTagsOptions = {}) {
    const startTime = window.performance.now();
    const fetchOptions = { asSystemRequest, version: TAGS_API_VERSION };
    const { tags: items } = await this.http.get<TagsListResponseBody>(TAGS_API_PATH, fetchOptions);
    const tags = items.map(toTag);
    const duration = window.performance.now() - startTime;
    reportPerformanceMetricEvent(this.analytics, {
      eventName: GET_ALL_TAGS_EVENT,
      duration,
    });

    trapErrors(() => {
      if (this.changeListener) {
        this.changeListener.onGetAll(tags);
      }
    });

    return tags;
  }

  public async delete(id: string) {
    const startTime = window.performance.now();
    await this.http.delete<{}>(buildTagPath(id), { version: TAGS_API_VERSION });
    const duration = window.performance.now() - startTime;
    reportPerformanceMetricEvent(this.analytics, {
      eventName: DELETE_TAG_EVENT,
      duration,
    });

    trapErrors(() => {
      if (this.changeListener) {
        this.changeListener.onDelete(id);
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
    const { tags = [] } = await this.find({ page: 1, perPage: 10000, search: name });
    if (exact) {
      const tag = tags.find((t) => t.name.toLocaleLowerCase() === name.toLocaleLowerCase());
      return tag ?? null;
    }
    return tags.length > 0 ? tags[0] : null;
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
      if (this.changeListener) {
        tagIds.forEach((tagId) => {
          this.changeListener!.onDelete(tagId);
        });
      }
    });
  }
}
