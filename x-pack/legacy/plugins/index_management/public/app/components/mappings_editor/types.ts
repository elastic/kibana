/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ReactNode, OptionHTMLAttributes } from 'react';

import { FieldConfig } from './shared_imports';
import { PARAMETERS_DEFINITION } from './constants';

export interface DataTypeDefinition {
  label: string;
  value: DataType;
  documentation?: {
    main: string;
    [key: string]: string;
  };
  subTypes?: { label: string; types: SubType[] };
  description?: () => ReactNode;
}

export type ConfigType =
  | 'dynamic'
  | 'date_detection'
  | 'numeric_detection'
  | 'dynamic_date_formats';

export type MainType =
  | 'text'
  | 'keyword'
  | 'numeric'
  | 'binary'
  | 'boolean'
  | 'range'
  | 'object'
  | 'nested'
  | 'alias'
  | 'completion'
  | 'dense_vector'
  | 'flattened'
  | 'ip'
  | 'join'
  | 'percolator'
  | 'rank_feature'
  | 'rank_features'
  | 'shape'
  | 'search_as_you_type'
  | 'date'
  | 'date_nanos'
  | 'geo_point'
  | 'geo_shape'
  | 'token_count';

export type SubType = NumericType | RangeType;

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

export type RangeType =
  | 'integer_range'
  | 'float_range'
  | 'long_range'
  | 'ip_range'
  | 'double_range'
  | 'date_range';

export type ParameterName =
  | 'name'
  | 'type'
  | 'store'
  | 'index'
  | 'fielddata'
  | 'fielddata_frequency_filter'
  | 'doc_values'
  | 'doc_values_binary'
  | 'coerce'
  | 'coerce_shape'
  | 'ignore_malformed'
  | 'null_value'
  | 'null_value_numeric'
  | 'null_value_boolean'
  | 'null_value_geo_point'
  | 'null_value_ip'
  | 'copy_to'
  | 'dynamic'
  | 'enabled'
  | 'boost'
  | 'locale'
  | 'format'
  | 'analyzer'
  | 'search_analyzer'
  | 'search_quote_analyzer'
  | 'index_options'
  | 'index_options_flattened'
  | 'index_options_keyword'
  | 'eager_global_ordinals'
  | 'index_prefixes'
  | 'index_phrases'
  | 'norms'
  | 'norms_keyword'
  | 'term_vector'
  | 'position_increment_gap'
  | 'similarity'
  | 'normalizer'
  | 'ignore_above'
  | 'split_queries_on_whitespace'
  | 'scaling_factor'
  | 'max_input_length'
  | 'preserve_separators'
  | 'preserve_position_increments'
  | 'ignore_z_value'
  | 'enable_position_increments'
  | 'orientation'
  | 'points_only'
  | 'path'
  | 'dims'
  | 'depth_limit';

export interface Parameter {
  fieldConfig: FieldConfig;
  paramName?: string;
  docs?: string;
  props?: { [key: string]: FieldConfig };
}

export interface Fields {
  [key: string]: Omit<Field, 'name'>;
}

interface FieldBasic {
  name: string;
  type: DataType;
  subType?: SubType;
  properties?: { [key: string]: Omit<Field, 'name'> };
  fields?: { [key: string]: Omit<Field, 'name'> };
}

type FieldParams = {
  [K in ParameterName]: typeof PARAMETERS_DEFINITION[K]['fieldConfig']['defaultValue'];
};

export type Field = FieldBasic & FieldParams;

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
  aliases: { [key: string]: string[] };
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

export type SelectOption<T extends string = string> = {
  value: unknown;
  text: T | ReactNode;
} & OptionHTMLAttributes<HTMLOptionElement>;

export interface SuperSelectOption {
  value: unknown;
  inputDisplay?: ReactNode;
  dropdownDisplay?: ReactNode;
  disabled?: boolean;
  'data-test-subj'?: string;
}

export interface AliasOption {
  id: string;
  label: string;
}

export interface IndexSettingsInterface {
  analysis?: {
    analyzer: {
      [key: string]: {
        type: string;
        tokenizer: string;
        char_filter?: string[];
        filter?: string[];
        position_increment_gap?: number;
      };
    };
  };
}

/**
 * When we define the index settings we can skip
 * the "index" property and directly add the "analysis".
 * ES always returns the settings wrapped under "index".
 */
export type IndexSettings = IndexSettingsInterface | { index: IndexSettingsInterface };

export interface ComboBoxOption {
  label: string;
  value?: unknown;
}
