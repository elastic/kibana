/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, inlineRootJsonSchemaRef, type ZodType } from '@kbn/zod/v4';
//
// eslint-disable-next-line @kbn/eslint/module_migration
import type { JSONSchema } from 'zod/v4/core/json-schema';

export const zodToBrowserToolSchema = (schema: ZodType): JSONSchema => {
  const { $schema: _$schema, ...rest } = z.toJSONSchema(schema, {
    io: 'input',
    unrepresentable: 'any',
  }) as Record<string, unknown>;
  return inlineRootJsonSchemaRef(rest);
};
