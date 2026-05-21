/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodType } from '@kbn/zod/v4';
import { decodeOrThrowZod } from '../common/runtime_types';

export const bulkDecodeSOAttributes = <T>(
  savedObjects: Array<{ id: string; attributes: unknown }>,
  schema: ZodType<T>
) => {
  const decodeRes = new Map<string, T>();

  for (const so of savedObjects) {
    decodeRes.set(so.id, decodeOrThrowZod(schema)(so.attributes));
  }

  return decodeRes;
};
