/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { buildPath } from '@kbn/core-http-browser';
import type { Reference } from '@kbn/content-management-utils';
import { isLensDSLConfig, type LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import { toAsCodeTags, toStoredTags } from '@kbn/as-code-shared-transforms';

import type { LensSavedObjectAttributes } from '@kbn/lens-common';
import { LENS_INTERNAL_VIS_API_PATH, LENS_INTERNAL_API_VERSION } from '../../common/constants';
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
  LensItemMeta,
  LensUpdateRequestQuery,
  LensApiConfigLibItemNoESQL,
} from '../../server/api/routes/types';
import { getLensBuilder } from '../lazy_builder';

export interface LensItemResponse<M extends Record<string, string | boolean> = {}> {
  item: LensItem;
  // TODO: align meta with public routes when internal routes are removed
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
    } = await this.http.get<LensGetResponseBody>(
      buildPath(`${LENS_INTERNAL_VIS_API_PATH}/{id}`, { id }),
      {
        version: LENS_INTERNAL_API_VERSION,
      }
    );

    const chartType = this.builder?.getType(data);

    if (this.builder?.isEnabled && this.builder?.isSupported(chartType)) {
      const config = data as LensApiConfigLibItemNoESQL;
      const { references: tagReferences } = toStoredTags(config);
      const attributes = this.builder.fromAPIFormat(config);
      return {
        item: {
          ...attributes,
          references: [...(attributes.references ?? []), ...tagReferences],
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
    references: Reference[]
  ): Promise<LensItemResponse> {
    if (visualizationType === null) {
      throw new Error('Missing visualization type');
    }

    const useApiFormat = this.builder?.isEnabled && this.builder?.isSupported(visualizationType);
    const body: LensCreateRequestBody =
      useApiFormat && this.builder
        ? (() => {
            const { tags } = toAsCodeTags(references);
            const chartConfig = this.builder.toAPIFormat({
              description,
              visualizationType,
              state,
              title,
              version,
              references,
            });

            if (isLensDSLConfig(chartConfig)) {
              return { ...chartConfig, tags };
            }

            throw new Error('ES|QL charts are not supported in Lens client');
          })()
        : {
            description,
            visualizationType,
            state,
            title,
            version,
            references,
          };

    const { data, meta, ...rest } = await this.http.post<LensCreateResponseBody>(
      LENS_INTERNAL_VIS_API_PATH,
      {
        body: JSON.stringify(body),
        version: LENS_INTERNAL_API_VERSION,
      }
    );

    if (useApiFormat && this.builder) {
      const config = data as LensApiConfigLibItemNoESQL;
      const { references: tagReferences } = toStoredTags(config);
      const attributes = this.builder.fromAPIFormat(config);
      return {
        item: {
          ...rest,
          ...attributes,
          references: [...(attributes.references ?? []), ...tagReferences],
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

    const useApiFormat = this.builder?.isEnabled && this.builder?.isSupported(visualizationType);
    const body: LensUpdateRequestBody =
      useApiFormat && this.builder
        ? (() => {
            const { tags } = toAsCodeTags(references);
            const chartConfig = this.builder.toAPIFormat({
              description,
              visualizationType,
              state,
              title,
              version,
              references,
            });

            if (isLensDSLConfig(chartConfig)) {
              return { ...chartConfig, tags };
            }

            throw new Error('ES|QL charts are not supported in Lens client');
          })()
        : {
            description,
            visualizationType,
            state,
            title,
            version,
            references,
          };

    const { data, meta, ...rest } = await this.http.put<LensUpdateResponseBody>(
      buildPath(`${LENS_INTERNAL_VIS_API_PATH}/{id}`, { id }),
      {
        body: JSON.stringify(body),
        query: options,
        version: LENS_INTERNAL_API_VERSION,
      }
    );

    if (useApiFormat && this.builder) {
      const config = data as LensApiConfigLibItemNoESQL;
      const { references: tagReferences } = toStoredTags(config);
      const attributes = this.builder.fromAPIFormat(config);
      return {
        item: {
          ...rest,
          ...attributes,
          references: [...(attributes.references ?? []), ...tagReferences],
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
    const response = await this.http.delete(
      buildPath(`${LENS_INTERNAL_VIS_API_PATH}/{id}`, { id }),
      {
        asResponse: true,
        version: LENS_INTERNAL_API_VERSION,
      }
    );
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
    const result = await this.http.get<LensSearchResponseBody>(LENS_INTERNAL_VIS_API_PATH, {
      query: {
        query,
        page,
        perPage,
        fields,
        searchFields,
      } satisfies LensSearchRequestQuery,
      version: LENS_INTERNAL_API_VERSION,
    });

    return result.data.map(({ id, data }) => {
      const chartType = this.builder?.getType(data);

      if (this.builder?.isEnabled && this.builder?.isSupported(chartType)) {
        const config = data as LensApiConfigLibItemNoESQL;
        const { references: tagReferences } = toStoredTags(config);
        const attributes = this.builder.fromAPIFormat(config);
        return {
          id,
          ...attributes,
          references: [...(attributes.references ?? []), ...tagReferences],
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
