/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { fieldMetadataPlainRT } from './fields_metadata/types';
export type {
  AnyFieldName,
  EcsFieldName,
  FieldAttribute,
  FieldMetadataPlain,
  FieldName,
  FieldSource,
  IntegrationFieldName,
  OtelFieldName,
  PartialFieldMetadataPlain,
  TEcsFields,
  TMetadataFields,
  TOtelFields,
} from './fields_metadata/types';

export { FieldMetadata } from './fields_metadata/models/field_metadata';
export { FieldsMetadataDictionary } from './fields_metadata/models/fields_metadata_dictionary';
export {
  createProxiedFieldsMap,
  createProxiedPlainFields,
  extractPrefixParts,
  SUPPORTED_PREFIXES,
} from './fields_metadata/utils/create_proxied_fields_map';
