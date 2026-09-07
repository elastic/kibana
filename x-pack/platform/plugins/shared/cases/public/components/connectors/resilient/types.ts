/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ResilientFieldMetadata {
  input_type: string;
  name: string;
  read_only: boolean;
  required: 'always' | 'close' | null;
  text: string;
  internal: boolean;
  prefix: string | null;
  values: Array<ResilientValuesItem> | null;
}

interface ResilientValuesItem {
  value: number | string;
  label: string;
  enabled: boolean;
  hidden: boolean;
  default: boolean;
}
