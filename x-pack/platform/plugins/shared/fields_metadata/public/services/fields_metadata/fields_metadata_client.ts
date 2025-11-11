/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { HashedCache } from '../../../common/hashed_cache';
import type {
  FindFieldsMetadataRequestQuery,
  FindFieldsMetadataResponsePayload,
} from '../../../common/latest';
import {
  findFieldsMetadataRequestQueryRT,
  findFieldsMetadataResponsePayloadRT,
} from '../../../common/latest';
import type { FieldName } from '../../../common/fields_metadata';
import {
  DecodeFieldsMetadataError,
  FetchFieldsMetadataError,
  FIND_FIELDS_METADATA_URL,
} from '../../../common/fields_metadata';
import { decodeOrThrow } from '../../../common/runtime_types';
import { createProxiedPlainFields } from '../../../common';
import type { IFieldsMetadataClient } from './types';

export class FieldsMetadataClient implements IFieldsMetadataClient {
  private cache: HashedCache<FindFieldsMetadataRequestQuery, FindFieldsMetadataResponsePayload>;

  constructor(private readonly http: HttpStart) {
    this.cache = new HashedCache();
  }

  public async find(
    params: FindFieldsMetadataRequestQuery
  ): Promise<FindFieldsMetadataResponsePayload> {
    // Initially lookup for existing results given request parameters
    if (this.cache.has(params)) {
      return this.cache.get(params) as FindFieldsMetadataResponsePayload;
    }

    // Convert FieldName[] to string[] for the encoder
    // - TypeScript interface allows FieldName[] (which can include numbers)
    // - Runtime encoder expects string[] only
    const encodableParams = {
      ...params,
      fieldNames: params.fieldNames?.map((name) => String(name)),
    };
    const query = findFieldsMetadataRequestQueryRT.encode(encodableParams);

    const response = await this.http
      .get(FIND_FIELDS_METADATA_URL, { query, version: '1' })
      .catch((error) => {
        throw new FetchFieldsMetadataError(
          `Failed to fetch fields ${truncateFieldNamesList(params.fieldNames)}: ${error.message}`
        );
      });

    const data = decodeOrThrow(
      findFieldsMetadataResponsePayloadRT,
      (message: string) =>
        new DecodeFieldsMetadataError(
          `Failed decoding fields ${truncateFieldNamesList(params.fieldNames)}: ${message}`
        )
    )(response);

    // Apply proxy to support prefixed field access on the client side (reuses shared utility)
    const proxiedData = {
      fields: createProxiedPlainFields(data.fields),
    };

    // Store cached results for given request parameters
    this.cache.set(params, proxiedData);

    return proxiedData;
  }
}

const truncateFieldNamesList = (fieldNames?: FieldName[]) => {
  if (!fieldNames || fieldNames.length === 0) return '';

  const visibleFields = fieldNames.slice(0, 3);
  const additionalFieldsCount = fieldNames.length - visibleFields.length;

  return visibleFields
    .join()
    .concat(additionalFieldsCount > 0 ? `+${additionalFieldsCount} fields` : '');
};
