/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FieldConfig } from './shared_imports';

export interface DataTypeDefinition {
  label: string;
  value: DataType;
  subTypes?: { label: string; types: SubType[] };
  configuration?: ParameterName[];
  basicParameters?: ParameterName[] | ParameterName[][];
  hasAdvancedParameters?: boolean;
  hasMultiFields?: boolean;
}

export type MainType =
  | 'text'
  | 'keyword'
  | 'numeric'
  | 'date'
  | 'binary'
  | 'boolean'
  | 'range'
  | 'object'
  | 'nested'
  | 'ip'
  | 'rank_feature'
  | 'rank_features'
  | 'dense_vector'
  | 'sparse_vector';

export type SubType = NumericType | DateType | RangeType;

export type DataType = MainType | SubType;

export type NumericType =
  | 'long'
  | 'integer'
  | 'short'
  | 'byte'
  | 'double'
  | 'float'
  | 'half_float'
  | 'scaled_float';

export type DateType = 'date' | 'date_nanos';

export type RangeType =
  | 'integer_range'
  | 'float_range'
  | 'long_range'
  | 'double_range'
  | 'date_range';

export type ParameterName =
  | 'name'
  | 'type'
  | 'store'
  | 'index'
  | 'fielddata'
  | 'doc_values'
  | 'coerce'
  | 'ignore_malformed'
  | 'null_value'
  | 'dynamic'
  | 'enabled'
  | 'boost'
  | 'locale'
  | 'format'
  | 'analyzer'
  | 'search_analyzer'
  | 'search_quote_analyzer'
  | 'index_options'
  | 'eager_global_ordinals'
  | 'index_prefixes'
  | 'index_phrases'
  | 'norms'
  | 'term_vector'
  | 'position_increment_gap'
  | 'similarity'
  | 'normalizer'
  | 'ignore_above'
  | 'split_queries_on_whitespace';

export interface Parameter {
  fieldConfig?: FieldConfig | { [key: string]: FieldConfig };
  paramName?: string;
  docs?: string;
}

export interface Fields {
  [key: string]: Omit<Field, 'name'>;
}

export interface Field {
  name: string;
  type: DataType;
  subType?: SubType;
  properties?: { [key: string]: Omit<Field, 'name'> };
  fields?: { [key: string]: Omit<Field, 'name'> };
}

export interface FieldMeta {
  childFieldsName: ChildFieldName | undefined;
  canHaveChildFields: boolean;
  canHaveMultiFields: boolean;
  hasChildFields: boolean;
  hasMultiFields: boolean;
  childFields?: string[];
  isExpanded: boolean;
}

export interface NormalizedFields {
  byId: {
    [id: string]: NormalizedField;
  };
  rootLevelFields: string[];
  maxNestedDepth: number;
}

export interface NormalizedField extends FieldMeta {
  id: string;
  parentId?: string;
  nestedDepth: number;
  path: string;
  source: Omit<Field, 'properties' | 'fields'>;
  isMultiField: boolean;
}

export type ChildFieldName = 'properties' | 'fields';

export type FieldsEditor = 'default' | 'json';
