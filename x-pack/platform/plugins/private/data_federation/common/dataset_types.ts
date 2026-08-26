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
}

/**
 * Dataset as returned from the list API or when creating, including the document
 * id (`name`) used in `PUT/DELETE /.../data_sets/{id}`.
 */
export type DataSetWithName = Dataset & { name: string };

export type DatasetSettings = DatasetSettingsFile;

export interface DatasetSettingsFile {
  format?: 'parquet' | 'csv' | 'tsv' | 'ndjson' | 'orc';

  // Universal
  partition_detection?: 'auto' | 'hive' | 'none';
  schema_resolution?: 'first_file_wins' | 'strict' | 'union_by_name';
  partition_path?: string;
  hive_partitioning?: boolean;

  // CSV/TSV + NDJSON
  schema_sample_size?: number;

  // CSV/TSV — commonly changed (core UI)
  delimiter?: string;
  mode?: 'quoted' | 'escaped' | 'plain';
  header_row?: boolean;

  // CSV/TSV — advanced
  null_value?: string;
  encoding?: string;
  quote?: string;
  escape?: string;
  comment?: string;
  column_prefix?: string;
  datetime_format?: string;
  multi_value_syntax?: 'none' | 'brackets';
  max_field_size?: number;

  // CSV/TSV — error handling
  error_mode?: 'fail_fast' | 'skip_row' | 'null_field';
  max_errors?: number;
  max_error_ratio?: number;

  // API-only (recognized by the API, not shown in the UI)
  target_split_size?: string;
  segment_size?: string;
  optimized_reader?: boolean;
  late_materialization?: boolean;
}
