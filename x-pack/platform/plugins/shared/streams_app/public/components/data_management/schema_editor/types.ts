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

export type SchemaFieldStatus = 'inherited' | 'mapped' | 'unmapped' | 'system';
export type SchemaFieldType = FieldDefinitionConfig['type'];

/**
 * Disk usage statistics for a field
 */
export interface FieldDiskUsage {
  /** Total disk usage in bytes across all storage types */
  total_in_bytes: number;
  /** Inverted index disk usage in bytes */
  inverted_index_in_bytes: number;
  /** Stored fields disk usage in bytes */
  stored_fields_in_bytes: number;
  /** Doc values disk usage in bytes */
  doc_values_in_bytes: number;
  /** Points (numeric range queries) disk usage in bytes */
  points_in_bytes: number;
  /** Norms disk usage in bytes */
  norms_in_bytes: number;
  /** Term vectors disk usage in bytes */
  term_vectors_in_bytes: number;
  /** KNN vectors disk usage in bytes */
  knn_vectors_in_bytes: number;
}

export interface BaseSchemaField extends Omit<FieldDefinitionConfig, 'type'> {
  name: string;
  parent: string;
  alias_for?: string;
  format?: string;
  source?: string;
  description?: string;
  streamSource?: 'template' | 'stream';
  /** Disk usage statistics for this field (if available) */
  diskUsage?: FieldDiskUsage;
  /** Whether this is a system/technical field that cannot be edited */
  isSystemField?: boolean;
}

export interface MappedSchemaField extends BaseSchemaField {
  status: 'inherited' | 'mapped' | 'system';
  type: SchemaFieldType;
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

export type SchemaField = MappedSchemaField | UnmappedSchemaField;

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
  stream: Streams.ingest.all.Definition;
  withControls?: boolean;
  withFieldSimulation?: boolean;
  withTableActions?: boolean;
  withToolbar?: boolean;
  enableGeoPointSuggestions?: boolean;
}

export const isSchemaFieldTyped = (field: SchemaField): field is MappedSchemaField => {
  return !!field && !!field.name && !!field.type;
};
