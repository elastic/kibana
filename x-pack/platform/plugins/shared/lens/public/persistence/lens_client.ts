/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { Reference } from '@kbn/content-management-utils';

import { omit } from 'lodash';
import { LENS_API_VERSION, LENS_VIS_API_PATH } from '../../common/constants';
import type { LensAttributes, LensItem } from '../../server/content_management';
import { ConfigBuilderStub } from '../../common/transforms';
import {
  type LensGetResponseBody,
  type LensCreateRequestBody,
  type LensCreateResponseBody,
  type LensUpdateRequestBody,
  type LensUpdateResponseBody,
  type LensSearchRequestQuery,
  type LensSearchResponseBody,
} from '../../server';
import type { LensSavedObjectAttributes } from '../react_embeddable/types';

/**
 * This type is to allow `visualizationType` to be `null` in the public context.
 *
 * The stored attributes must have a `visualizationType`.
 */
export type LooseLensAttributes = Omit<LensAttributes, 'visualizationType'> &
  Pick<LensSavedObjectAttributes, 'visualizationType'>;

export class LensClient {
  constructor(private http: HttpStart) {}

  async get(id: string) {
    const { data, meta } = await this.http.get<LensGetResponseBody>(`${LENS_VIS_API_PATH}/${id}`, {
      version: LENS_API_VERSION,
    });

    return {
      item: ConfigBuilderStub.in(data),
      meta, // TODO: see if we still need this meta data
    };
  }

  async create(
    { description, visualizationType, state, title, version }: LooseLensAttributes,
    references: Reference[],
    options: LensCreateRequestBody['options'] = {}
  ) {
    if (visualizationType === null) {
      throw new Error('Missing visualization type');
    }

    const body: LensCreateRequestBody = {
      // TODO: Find a better way to conditionally omit id
      data: omit(
        ConfigBuilderStub.out({
          id: '',
          description,
          visualizationType,
          state,
          title,
          version,
          references,
        }),
        'id'
      ),
      options,
    };

    const { data, meta } = await this.http.post<LensCreateResponseBody>(LENS_VIS_API_PATH, {
      body: JSON.stringify(body),
      version: LENS_API_VERSION,
    });

    return {
      item: ConfigBuilderStub.in(data),
      meta,
    };
  }

  async update(
    id: string,
    { description, visualizationType, state, title, version }: LooseLensAttributes,
    references: Reference[],
    options: LensUpdateRequestBody['options'] = {}
  ) {
    if (visualizationType === null) {
      throw new Error('Missing visualization type');
    }

    const body: LensUpdateRequestBody = {
      // TODO: Find a better way to conditionally omit id
      data: omit(
        ConfigBuilderStub.out({
          id: '',
          description,
          visualizationType,
          state,
          title,
          version,
          references,
        }),
        'id'
      ),
      options,
    };

    const { data, meta } = await this.http.put<LensUpdateResponseBody>(
      `${LENS_VIS_API_PATH}/${id}`,
      {
        body: JSON.stringify(body),
        version: LENS_API_VERSION,
      }
    );

    return {
      item: ConfigBuilderStub.in(data),
      meta,
    };
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const response = await this.http.delete(`${LENS_VIS_API_PATH}/${id}`, {
      asResponse: true,
      version: LENS_API_VERSION,
    });
    const success = response.response?.ok ?? false;

    return { success }; // TODO remove if not used
  }

  async search({
    query,
    page,
    perPage,
    fields,
    searchFields,
  }: LensSearchRequestQuery): Promise<LensItem[]> {
    // TODO add all CM search options to query
    const result = await this.http.get<LensSearchResponseBody>(LENS_VIS_API_PATH, {
      query: {
        query,
        page,
        perPage,
        fields,
        searchFields,
      } satisfies LensSearchRequestQuery,
      version: LENS_API_VERSION,
    });

    return result.data.map(({ data }) => ({
      ...data,
      attributes: ConfigBuilderStub.in(data),
    }));
  }
}
