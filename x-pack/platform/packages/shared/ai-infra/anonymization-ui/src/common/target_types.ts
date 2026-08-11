/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TARGET_TYPE_INDEX = 'index' as const;
export const TARGET_TYPE_INDEX_PATTERN = 'index_pattern' as const;
export const TARGET_TYPE_DATA_VIEW = 'data_view' as const;

export const TARGET_TYPES = [
  TARGET_TYPE_INDEX,
  TARGET_TYPE_INDEX_PATTERN,
  TARGET_TYPE_DATA_VIEW,
] as const;

export type TargetType = (typeof TARGET_TYPES)[number];
