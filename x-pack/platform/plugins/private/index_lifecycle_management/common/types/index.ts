/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type * from './api';

export * from '@kbn/index-lifecycle-management-common-shared';

import type { Index as IndexImported } from '@kbn/index-management-plugin/common';

// index management plugin uses number for these fields
export interface Index extends Omit<IndexImported, 'size' | 'primary_size'> {
  size?: string;
  primary_size?: string;
}

/**
 * These roles reflect how nodes are stratified into different data tiers.
 */
export type DataTierRole = 'data_hot' | 'data_warm' | 'data_cold' | 'data_frozen';

/**
 * The "data_content" role can store all data the ES stack uses for feature
 * functionality like security-related indices.
 */
export type DataRole = 'data_content' | DataTierRole;

/**
 * The "data" role can store data allocated to any tier.
 */
export type AnyDataRole = 'data' | DataRole;
