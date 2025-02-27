/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const STORED_SOURCE_OPTION = 'stored';
export const DISABLED_SOURCE_OPTION = 'disabled';
export const SYNTHETIC_SOURCE_OPTION = 'synthetic';

export type SourceOptionKey =
  | typeof STORED_SOURCE_OPTION
  | typeof DISABLED_SOURCE_OPTION
  | typeof SYNTHETIC_SOURCE_OPTION;
