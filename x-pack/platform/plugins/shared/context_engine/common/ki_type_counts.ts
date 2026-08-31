/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiTypeCount } from './http_api/ai_indices';

export const MAX_KI_TYPE_FILTER_COUNT = 5;

export const takeTopKiTypeCounts = (counts: KiTypeCount[]): KiTypeCount[] =>
  counts.slice(0, MAX_KI_TYPE_FILTER_COUNT);
