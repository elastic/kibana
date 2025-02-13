/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface KVProcessor {
  field: string;
  value_split: string;
  field_split: string;
  trim_key: string;
  trim_value: string;
  packageName: string;
  dataStreamName: string;
}
