/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export type ConfigType = TypeOf<typeof ConfigSchema>;

export const ConfigSchema = schema.object(
  {
    encryptionKey: schema.conditional(
      schema.contextRef('dist'),
      true,
      schema.maybe(schema.string({ minLength: 32 })),
      schema.string({ minLength: 32, defaultValue: 'a'.repeat(32) })
    ),
    keyRotation: schema.object({
      decryptionOnlyKeys: schema.arrayOf(schema.string({ minLength: 32 }), { defaultValue: [] }),
    }),
  },
  {
    validate(value) {
      const decryptionOnlyKeys = value.keyRotation?.decryptionOnlyKeys ?? [];
      if (value.encryptionKey && decryptionOnlyKeys.includes(value.encryptionKey)) {
        return '`keyRotation.decryptionOnlyKeys` cannot contain primary encryption key specified in `encryptionKey`.';
      }
    },
  }
);
