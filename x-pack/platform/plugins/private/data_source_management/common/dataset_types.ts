/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Dataset {
  dataSourceId: string;
  resource: string;
  description?: string;
  settings?: DatasetSettings;
}

interface DatasetSettings {
  format?: 'parquet' | 'csv' | 'ndjson' | 'orc';
  errorMode?: 'fail_fast' | 'skip_row' | 'null_field';
  maxErrors?: number;
  maxErrorRatio?: number; // between 0 and 1
  partitionDetection?: 'auto' | 'hive' | 'template' | 'none';
  partitionPath?: string;
  hivePartitioning?: boolean;
}
