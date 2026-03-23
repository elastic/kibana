/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObjectType, Type } from '@kbn/config-schema';

export type InferObjectSchema<S> = {
  [Property in keyof (S extends ObjectType<infer O> ? O : never)]: (S extends ObjectType<infer O>
    ? O
    : never)[Property] extends Type<infer T>
    ? T extends ObjectType
      ? InferObjectSchema<T>
      : T
    : never;
};
