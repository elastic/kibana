/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { z } from '@kbn/zod/v4';

export const logLevelRt = t.union([
  t.literal('trace'),
  t.literal('debug'),
  t.literal('info'),
  t.literal('warning'),
  t.literal('error'),
  t.literal('critical'),
  t.literal('off'),
]);

// zod equivalent, additive (io-ts -> zod migration, elastic/kibana#243355).
export const logLevelSchema = z.enum([
  'trace',
  'debug',
  'info',
  'warning',
  'error',
  'critical',
  'off',
]);
