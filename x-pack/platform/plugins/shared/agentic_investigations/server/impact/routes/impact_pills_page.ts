/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  IMPACT_PILLS_PAGE_SIZE,
  MAX_IMPACT_PILLS_PAGE_SIZE,
  MAX_IMPACT_PILLS_REACH,
} from '../../../common/impact/constants';

export const impactPillsPageShape = () => ({
  from: z.coerce.number().int().min(0).max(MAX_IMPACT_PILLS_REACH).default(0),
  size: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_IMPACT_PILLS_PAGE_SIZE)
    .default(IMPACT_PILLS_PAGE_SIZE),
});

export const fitsPillsReach = ({ from, size }: { from: number; size: number }): boolean =>
  from + size <= MAX_IMPACT_PILLS_REACH;

export const PILLS_REACH_MESSAGE = `from + size may not exceed ${MAX_IMPACT_PILLS_REACH}`;
