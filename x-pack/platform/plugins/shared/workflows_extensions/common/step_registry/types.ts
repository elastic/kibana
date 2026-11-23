/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseStepDefinition } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';

/**
 * Common step definition fields shared between server and public.
 * Extends BaseStepDefinition from @kbn/workflows with the same generic schema triple.
 * Input and output types are automatically inferred from the schemas.
 */
export type CommonStepDefinition<
  InputSchema extends z.ZodType = z.ZodType,
  OutputSchema extends z.ZodType = z.ZodType,
  ConfigSchema extends z.ZodObject = z.ZodObject
> = BaseStepDefinition<InputSchema, OutputSchema, ConfigSchema>;
