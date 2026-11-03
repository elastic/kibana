/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Dataset {
  data_source: string;
  resource: string;
  description?: string;
  settings?: DatasetSettings;
  /**
   * Optional dataset mapping declaration. When provided, it controls exposed column names and types.
   * See: https://www.elastic.co/docs/reference/query-languages/esql/esql-data-federation-schema#declare-a-schema-explicitly
   */
  mappings?: DatasetMappings;
}

/**
 * Dataset as returned from the list API or when creating, including the document
 * id (`name`) used in `PUT/DELETE /.../data_sets/{id}`.
 */
export type DataSetWithName = Dataset & { name: string };

export type DatasetSettings = DatasetSettingsFile;

export type DatasetMappingsDynamic = 'true' | 'false';

export type DatasetMappingFieldType =
  | 'keyword'
  | 'long'
  | 'integer'
  | 'double'
  | 'boolean'
  | 'date'
  | 'date_nanos'
  | 'unsigned_long'
  | 'ip';

export interface DatasetMappingProperty {
  type: DatasetMappingFieldType;
  /**
   * Optional physical column name. Use it to expose a file column under a different logical name.
   */
  path?: string;
  /**
   * Optional date parsing pattern for a column with type `date` or `date_nanos`.
   */
  format?: string;
}

export interface DatasetMappings {
  /**
   * Controls undeclared columns. The default, `true`, overlays the declared columns on the inferred schema.
   * Set it to `false` to treat the declaration as the complete schema.
   */
  dynamic?: DatasetMappingsDynamic;
  properties: Record<string, DatasetMappingProperty>;
}

export type DatasetFormat = 'parquet' | 'csv' | 'tsv' | 'ndjson';
export type DatasetErrorMode = 'fail_fast' | 'skip_row' | 'null_field';
export type DatasetMode = 'quoted' | 'escaped' | 'plain';
export type DatasetPartitionDetection = 'auto' | 'hive' | 'template' | 'none';
export type DatasetSchemaResolution = 'first_file_wins' | 'strict' | 'union_by_name';
/** String form of a boolean dataset setting. */
export type DatasetBooleanString = 'true' | 'false';

export interface DatasetSettingsFile {
  format?: DatasetFormat;

  // Universal
  file_exclusions?: string[];
  partition_detection?: DatasetPartitionDetection;
  schema_resolution?: DatasetSchemaResolution;
  partition_path?: string;
  hive_partitioning?: boolean;

  // CSV/TSV + NDJSON
  schema_sample_size?: number;

  // CSV/TSV — commonly changed (core UI)
  delimiter?: string;
  mode?: DatasetMode;
  header_row?: boolean;
  skip_rows?: number;
  datetime_format?: string;
  null_value?: string;
  encoding?: string;

  // CSV/TSV — advanced
  quote?: string;
  escape?: string;
  comment?: string;
  column_prefix?: string;
  trim_spaces?: boolean;
  multi_value_syntax?: 'none' | 'brackets';
  max_field_size?: number;

  // CSV/TSV — error handling
  error_mode?: DatasetErrorMode;
  max_errors?: number;
  max_error_ratio?: number;

  // API-only (recognized by the API, not shown in the UI)
  target_split_size?: string;
  split_probe_window?: string;
  segment_size?: string;
  max_split_probes?: number;
  file_sort_by?: 'list' | 'name' | 'mtime';
  file_order?: 'asc' | 'desc';
  partition_sample_size?: string;
  region?: string;
}
