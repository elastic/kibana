/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { StorageFieldTypeOf, StorageMappingProperty } from './types';

interface StorageSchemaProperties {
  [x: string]: StorageMappingProperty;
}

export interface StorageSchema {
  properties: StorageSchemaProperties;
}

interface StorageSettingsBase {
  schema: StorageSchema;
}

export interface IndexStorageSettings extends StorageSettingsBase {
  name: string;
}

export type StorageSettings = IndexStorageSettings;

export interface IStorageAdapter<TStorageSettings extends StorageSettings = never> {
  getSearchIndexPattern(): string;
}

export type StorageSettingsOf<TStorageAdapter extends IStorageAdapter<StorageSettings>> =
  TStorageAdapter extends IStorageAdapter<infer TStorageSettings>
    ? TStorageSettings extends StorageSettings
      ? TStorageSettings
      : never
    : never;

export type StorageDocumentOf<TStorageSettings extends StorageSettings> = {
  [TKey in keyof TStorageSettings['schema']['properties']]: StorageFieldTypeOf<
    TStorageSettings['schema']['properties'][TKey]
  >;
} & { _id: string };

export { StorageIndexAdapter } from './index_adapter';
export { StorageClient } from './storage_client';
export { types } from './types';
