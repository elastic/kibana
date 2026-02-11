/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FieldDefinitionConfig,
  FieldDefinitionConfigAdvancedParameters,
  Streams,
} from '@kbn/streams-schema';
import type { TableColumnName } from './constants';

export type SchemaFieldStatus = 'inherited' | 'mapped' | 'unmapped';
/**
 * Field types used by the Schema editor UI.
 *
 * Note: the UI supports pseudo-types like `system` and `unmapped` that must never be
 * persisted as real mapping types.
 */
export type SchemaFieldType = NonNullable<FieldDefinitionConfig['type']> | 'system' | 'unmapped';
export type PersistableSchemaFieldType = SchemaFieldType;

export interface BaseSchemaField extends Omit<FieldDefinitionConfig, 'type'> {
  name: string;
  parent: string;
  alias_for?: string;
  format?: string;
  source?: string;
  description?: string;
  streamSource?: 'template' | 'stream';
}

export interface MappedSchemaField extends BaseSchemaField {
  status: 'mapped';
  type: SchemaFieldType;
  /**
   * Elasticsearch-level type of the field - available when field exists in ES but may not be directly supported by streams schema
   */
  esType?: string;
  additionalParameters?: FieldDefinitionConfigAdvancedParameters;
}

export interface InheritedSchemaField extends BaseSchemaField {
  status: 'inherited';
  type?: SchemaFieldType;
  /**
   * Elasticsearch-level type of the field - available when field exists in ES but may not be directly supported by streams schema
   */
  esType?: string;
  additionalParameters?: FieldDefinitionConfigAdvancedParameters;
}

export interface UnmappedSchemaField extends BaseSchemaField {
  status: 'unmapped';
  type?: SchemaFieldType;
  /**
   * Elasticsearch-level type of the field - only available for fields of classic streams that are not mapped through streams but from the underlying index.
   */
  esType?: string;
  additionalParameters?: FieldDefinitionConfigAdvancedParameters;
}

export type SchemaField = MappedSchemaField | UnmappedSchemaField | InheritedSchemaField;

export type SchemaEditorField = SchemaField & {
  result?: 'created' | 'modified';
  uncommitted?: boolean;
};

export interface SchemaEditorProps {
  defaultColumns?: TableColumnName[];
  fields: SchemaEditorField[];
  isLoading?: boolean;
  onAddField?: (field: SchemaField) => void;
  onFieldUpdate: (field: SchemaField) => void;
  onRefreshData?: () => void;
  onFieldSelection: (names: string[], selected: boolean) => void;
  fieldSelection: string[];
  stream: Streams.all.Definition;
  withControls?: boolean;
  withFieldSimulation?: boolean;
  withTableActions?: boolean;
  withToolbar?: boolean;
  enableGeoPointSuggestions?: boolean;
}

export type TypedMappedSchemaField = MappedSchemaField & {
  type: Exclude<SchemaFieldType, 'system' | 'unmapped'>;
};

export const isSchemaFieldTyped = (field: SchemaField): field is TypedMappedSchemaField => {
  return (
    !!field &&
    !!field.name &&
    field.status === 'mapped' &&
    !!field.type &&
    field.type !== 'unmapped' &&
    field.type !== 'system'
  );
};
