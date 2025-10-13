/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlToolConfig } from '@kbn/onechat-common';
import { z } from '@kbn/zod';

export function createSchemaFromParams(params: EsqlToolConfig['params']): z.ZodObject<any> {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  for (const [key, param] of Object.entries(params)) {
    let field: z.ZodTypeAny;
    switch (param.type) {
      case 'text':
      case 'keyword':
        field = z.string();
        break;
      case 'long':
      case 'integer':
        field = z.number().int();
        break;
      case 'double':
      case 'float':
        field = z.number();
        break;
      case 'boolean':
        field = z.boolean();
        break;
      case 'date':
        field = z.string().datetime();
        break;
      case 'object':
        field = z.record(z.unknown());
        break;
      case 'nested':
        field = z.array(z.record(z.unknown()));
        break;
    }

    if (param.optional) {
      if (param.defaultValue !== undefined) {
        // Use default value instead of making it optional
        field = field.default(param.defaultValue);
      } else {
        // No default value, make it optional
        field = field.optional();
      }
    }

    field = field.describe(param.description);

    schemaFields[key] = field;
  }

  return z.object(schemaFields).describe('Parameters needed to execute the query');
}
