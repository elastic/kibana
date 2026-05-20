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

export type DatasetSettings = DatasetSettingsFile | DatasetSettingsParquet;

export interface DatasetSettingsFile {
  format?: 'csv' | 'ndjson' | 'orc';
  errorMode?: 'fail_fast' | 'skip_row' | 'null_field';
  maxErrors?: number;
  maxErrorRatio?: number; // between 0 and 1
  partitionDetection?: 'auto' | 'hive' | 'template' | 'none';
  partitionPath?: string;
  hivePartitioning?: boolean;
}

export interface DatasetSettingsParquet {
  format: 'parquet';
}
