/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin as PluginClass } from '@kbn/core/public';
import type { UseFieldsMetadataHook } from './hooks/use_fields_metadata/use_fields_metadata';
import type { FieldsMetadataServiceStart } from './services/fields_metadata';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FieldsMetadataPublicSetup {}

export interface FieldsMetadataPublicStart {
  getClient: FieldsMetadataServiceStart['getClient'];
  useFieldsMetadata: UseFieldsMetadataHook;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FieldsMetadataPublicSetupDeps {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FieldsMetadataPublicStartDeps {}

export type FieldsMetadataClientCoreSetup = CoreSetup<
  FieldsMetadataPublicStartDeps,
  FieldsMetadataPublicStart
>;
export type FieldsMetadataClientCoreStart = CoreStart;
export type FieldsMetadataClientPluginClass = PluginClass<
  FieldsMetadataPublicSetup,
  FieldsMetadataPublicStart,
  FieldsMetadataPublicSetupDeps,
  FieldsMetadataPublicStartDeps
>;

export type FieldsMetadataPublicStartServicesAccessor =
  FieldsMetadataClientCoreSetup['getStartServices'];
export type FieldsMetadataPublicStartServices =
  ReturnType<FieldsMetadataPublicStartServicesAccessor>;
