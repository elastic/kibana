/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import {
  UpdateTagAssignmentsOptions,
  FindAssignableObjectsOptions,
  AssignableObject,
} from '../../../common/assignments';
import {
  FindAssignableObjectResponse,
  GetAssignableTypesResponse,
} from '../../../common/http_api_types';

export interface ITagAssignmentService {
  /**
   * Search API that only returns objects that are effectively assignable to tags for the current user.
   */
  findAssignableObjects(options: FindAssignableObjectsOptions): Promise<AssignableObject[]>;
  /**
   * Update the assignments for given tag ids, by adding or removing object assignments to them.
   */
  updateTagAssignments(options: UpdateTagAssignmentsOptions): Promise<void>;
  /**
   * Return the list of saved object types the user can assign tags to.
   */
  getAssignableTypes(): Promise<string[]>;
}

export interface TagAssignmentServiceOptions {
  http: HttpSetup;
}

export class TagAssignmentService implements ITagAssignmentService {
  private readonly http: HttpSetup;

  constructor({ http }: TagAssignmentServiceOptions) {
    this.http = http;
  }

  public async findAssignableObjects({ search, types, maxResults }: FindAssignableObjectsOptions) {
    const { objects } = await this.http.get<FindAssignableObjectResponse>(
      '/internal/saved_objects_tagging/assignments/_find_assignable_objects',
      {
        query: {
          search,
          types,
          max_results: maxResults,
        },
      }
    );
    return objects;
  }

  public async updateTagAssignments({ tags, assign, unassign }: UpdateTagAssignmentsOptions) {
    await this.http.post<{}>('/api/saved_objects_tagging/assignments/update_by_tags', {
      body: JSON.stringify({
        tags,
        assign,
        unassign,
      }),
    });
  }

  public async getAssignableTypes() {
    const { types } = await this.http.get<GetAssignableTypesResponse>(
      '/internal/saved_objects_tagging/assignments/_assignable_types'
    );
    return types;
  }
}
