/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod, DeepStrict } from '@kbn/zod-helpers/v4';
import type { z } from '@kbn/zod/v4';

/**
 * Like `buildRouteValidationWithZod`, but wraps the schema with `DeepStrict` so
 * that any unrecognized key at any nesting level causes a 400 instead of being
 * silently stripped. Applied to every Entity Store route's request validation
 * (body, query, params) to guarantee a uniform strict-input contract.
 */
export const buildStrictRouteValidationWithZod = <T extends z.ZodType>(schema: T) =>
  buildRouteValidationWithZod(DeepStrict(schema));
