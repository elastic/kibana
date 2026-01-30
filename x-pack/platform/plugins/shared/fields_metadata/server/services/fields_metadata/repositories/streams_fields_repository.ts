/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldMetadata } from '../../../../common/fields_metadata/models/field_metadata';
import { HashedCache } from '../../../../common/hashed_cache';
import type { AnyFieldName } from '../../../../common';
import type {
  ExtractedStreamFields,
  StreamsFieldsExtractor,
  StreamsFieldsSearchParams,
} from './types';

interface StreamsFieldsRepositoryDeps {
  streamsFieldsExtractor: StreamsFieldsExtractor;
}

type StreamFieldsMetadata = Record<string, FieldMetadata>;

export class StreamsFieldsRepository {
  private cache: HashedCache<StreamsFieldsSearchParams, StreamFieldsMetadata>;

  private constructor(private readonly streamsFieldsExtractor: StreamsFieldsExtractor) {
    this.cache = new HashedCache();
  }

  async getByName(
    fieldName: AnyFieldName,
    params: Partial<StreamsFieldsSearchParams>
  ): Promise<FieldMetadata | undefined> {
    const { streamName } = params;

    if (!streamName) {
      return undefined;
    }

    let field = this.getCachedField(fieldName, { streamName });

    if (!field) {
      await this.extractFields({ streamName });
      field = this.getCachedField(fieldName, { streamName });
    }

    return field;
  }

  public static create({ streamsFieldsExtractor }: StreamsFieldsRepositoryDeps) {
    return new StreamsFieldsRepository(streamsFieldsExtractor);
  }

  private async extractFields({ streamName }: StreamsFieldsSearchParams): Promise<void> {
    const cacheKey = { streamName };
    const cachedFields = this.cache.get(cacheKey);

    if (cachedFields) {
      return;
    }

    return this.streamsFieldsExtractor({ streamName })
      .then(this.mapExtractedFieldsToFieldMetadata)
      .then((fieldMetadata) => this.storeFieldsInCache(cacheKey, fieldMetadata));
  }

  private getCachedField(
    fieldName: AnyFieldName,
    { streamName }: StreamsFieldsSearchParams
  ): FieldMetadata | undefined {
    const cacheKey = { streamName };
    const cachedFields = this.cache.get(cacheKey);

    if (!cachedFields) {
      return undefined;
    }

    return cachedFields[fieldName];
  }

  private storeFieldsInCache = (
    cacheKey: StreamsFieldsSearchParams,
    extractedFieldsMetadata: StreamFieldsMetadata
  ): void => {
    const cachedFields = this.cache.get(cacheKey);

    if (!cachedFields) {
      this.cache.set(cacheKey, extractedFieldsMetadata);
    } else {
      this.cache.set(cacheKey, { ...cachedFields, ...extractedFieldsMetadata });
    }
  };

  private mapExtractedFieldsToFieldMetadata = (
    extractedFields: ExtractedStreamFields
  ): StreamFieldsMetadata => {
    const fieldEntries = Object.entries(extractedFields);

    return fieldEntries.reduce((fieldsMetadata, [fieldName, field]) => {
      fieldsMetadata[fieldName] = FieldMetadata.create({ ...field, source: 'streams' });
      return fieldsMetadata;
    }, {} as StreamFieldsMetadata);
  };
}
