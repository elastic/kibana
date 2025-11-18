/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { UnionTypeOptions } from '@kbn/config-schema/src/types';

export const stringOrStringArraySchema = (options?: UnionTypeOptions<string | string[]>) =>
  schema.oneOf([schema.arrayOf(schema.string()), schema.string()], options);
