/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { getFieldsFromZodSchema } from './get_step_preview_fields';

describe('getFieldsFromZodSchema', () => {
  it('marks optional fields and extracts descriptions', () => {
    const schema = z.object({
      mode: z.enum(['fast', 'accurate']).describe('Processing mode'),
      note: z.string().describe('Optional note').optional(),
      nullableNote: z.string().nullable().optional(),
    });

    expect(getFieldsFromZodSchema(schema)).toEqual([
      {
        name: 'mode',
        typeName: expect.any(String),
        description: 'Processing mode',
        required: true,
      },
      {
        name: 'note',
        typeName: 'STRING',
        description: 'Optional note',
        required: false,
      },
      {
        name: 'nullableNote',
        typeName: 'STRING',
        description: undefined,
        required: false,
      },
    ]);
  });
});
