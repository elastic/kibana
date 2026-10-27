/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Marks a step input as optional in a way that survives Liquid templating.
 *
 * A workflow reaches a step through templates, and a template for an absent
 * input still renders — it renders as `''`. Plain `.optional()` therefore
 * rejects `'${{ inputs.actionInput }}'` for an omitted `actionInput` before the
 * handler ever runs. Treating `''` and `null` as absent keeps the omission an
 * omission.
 */
export const optionalStepInput = <Schema extends z.ZodType>(schema: Schema) =>
  z.preprocess((value) => (value === '' || value === null ? undefined : value), schema.optional());
