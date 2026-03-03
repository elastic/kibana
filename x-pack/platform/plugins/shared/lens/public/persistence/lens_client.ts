/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { Reference } from '@kbn/content-management-utils';
import type { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import type { LensApiState } from '@kbn/lens-embeddable-utils/config_builder/schema';

import type { LensSavedObjectAttributes } from '@kbn/lens-common';
import { LENS_API_VERSION, LENS_VIS_API_PATH } from '../../common/constants';
import type { LensAttributes, LensItem } from '../../server/content_management';
import {
  type LensGetResponseBody,
  type LensCreateRequestBody,
  type LensCreateResponseBody,
  type LensUpdateRequestBody,
  type LensUpdateResponseBody,
  type LensSearchRequestQuery,
  type LensSearchResponseBody,
} from '../../server';
import type {
  LensCreateRequestQuery,
  LensItemMeta,
  LensUpdateRequestQuery,
} from '../../server/api/routes/visualizations/types';
import { getLensBuilder } from '../lazy_builder';

export interface LensItemResponse<M extends Record<string, string | boolean> = {}> {
  item: LensItem;
  meta: LensItemMeta & M;
}

/**
 * This type is to allow `visualizationType` to be `null` in the public context.
 *
 * The stored attributes must have a `visualizationType`.
 */
export type LooseLensAttributes = Omit<LensAttributes, 'visualizationType'> &
  Pick<LensSavedObjectAttributes, 'visualizationType'>;

export class LensClient {
  private builder: LensConfigBuilder | null;

  constructor(private http: HttpStart) {
    this.builder = getLensBuilder();
  }

  async get(id: string): Promise<LensItemResponse<LensGetResponseBody['meta']>> {
    const {
      data,
      meta,
      id: responseId,
    } = await this.http.get<LensGetResponseBody>(`${LENS_VIS_API_PATH}/${id}`, {
      version: LENS_API_VERSION,
    });

    const chartType = this.builder?.getType(data);

    if (this.builder?.isSupported(chartType)) {
      const config = data as LensApiState;
      return {
        item: {
          ...this.builder.fromAPIFormat(config),
          id: responseId,
        },
        meta,
      };
    }

    if (!('state' in data)) {
      // This should never happen, only to typeguard until fully supported
      throw new Error('Failure to transform API Format');
    }

    return {
      item: {
        ...data,
        id: responseId,
        description: data.description ?? undefined,
      },
      meta,
    };
  }

  async create(
    { description, visualizationType, state, title, version }: LooseLensAttributes,
    references: Reference[],
    options: LensCreateRequestQuery = {}
  ): Promise<LensItemResponse> {
    if (visualizationType === null) {
      throw new Error('Missing visualization type');
    }

    const useApiFormat = this.builder?.isSupported(visualizationType);
    const body: LensCreateRequestBody =
      useApiFormat && this.builder
        ? this.builder.toAPIFormat({
            description,
            visualizationType,
            state,
            title,
            version,
            references,
          })
        : {
            description,
            visualizationType,
            state,
            title,
            version,
            references,
          };

    const { data, meta, ...rest } = await this.http.post<LensCreateResponseBody>(
      LENS_VIS_API_PATH,
      {
        body: JSON.stringify(body),
        query: options,
        version: LENS_API_VERSION,
      }
    );

    if (useApiFormat && this.builder) {
      const config = data as LensApiState;
      return {
        item: {
          ...rest,
          ...this.builder.fromAPIFormat(config),
        },
        meta,
      };
    }

    if (!('state' in data)) {
      // This should never happen, only to typeguard until fully supported
      throw new Error('Failure to transform API Format');
    }

    return {
      item: {
        ...rest,
        ...data,
        description: data.description ?? undefined,
      },
      meta,
    };
  }

  async update(
    id: string,
    { description, visualizationType, state, title, version }: LooseLensAttributes,
    references: Reference[],
    options: LensUpdateRequestQuery = {}
  ): Promise<LensItemResponse> {
    if (visualizationType === null) {
      throw new Error('Missing visualization type');
    }

    const useApiFormat = this.builder?.isSupported(visualizationType);
    const body: LensUpdateRequestBody =
      useApiFormat && this.builder
        ? this.builder.toAPIFormat({
            description,
            visualizationType,
            state,
            title,
            version,
            references,
          })
        : {
            description,
            visualizationType,
            state,
            title,
            version,
            references,
          };

    const { data, meta, ...rest } = await this.http.put<LensUpdateResponseBody>(
      `${LENS_VIS_API_PATH}/${id}`,
      {
        body: JSON.stringify(body),
        query: options,
        version: LENS_API_VERSION,
      }
    );

    if (useApiFormat && this.builder) {
      const config = data as LensApiState;
      return {
        item: {
          ...rest,
          ...this.builder.fromAPIFormat(config),
        },
        meta,
      };
    }

    if (!('state' in data)) {
      // This should never happen, only to typeguard until fully supported
      throw new Error('Failure to transform API Format');
    }

    return {
      item: {
        ...rest,
        ...data,
        description: data.description ?? undefined,
      },
      meta,
    };
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const response = await this.http.delete(`${LENS_VIS_API_PATH}/${id}`, {
      asResponse: true,
      version: LENS_API_VERSION,
    });
    const success = response.response?.ok ?? false;

    return { success };
  }

  async search({
    query,
    page,
    perPage,
    fields,
    searchFields,
  }: LensSearchRequestQuery): Promise<LensItem[]> {
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

    return result.data.map(({ id, data }) => {
      const chartType = this.builder?.getType(data);

      if (this.builder?.isSupported(chartType)) {
        const config = data as LensApiState;
        return {
          id,
          ...this.builder.fromAPIFormat(config),
        } satisfies LensItem;
      }

      if (!('state' in data)) {
        // This should never happen, only to typeguard until fully supported
        throw new Error('Failure to transform API Format');
      }

      return {
        id,
        ...data,
        description: data.description ?? undefined,
      } satisfies LensItem;
    });
  }
}
