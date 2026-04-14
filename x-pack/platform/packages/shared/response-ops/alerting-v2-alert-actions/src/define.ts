/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { AlertActionTypeDefinition } from './types';

/**
 * Defines a new alert action type from a minimal declaration and auto-derives
 * the schemas needed by the route layer and the schemas package.
 *
 * - `fullSchema`      – bodySchema fields + `action_type` literal (discriminated union member)
 * - `routeBodySchema` – bodySchema with `.strict()` (rejects unknown fields at the HTTP layer)
 * - `pathSuffix`      – defaults to `_${id}` when omitted
 * - `esMappings`      – defaults to `{}` when omitted
 */
export const defineAlertActionType = <TId extends string, TShape extends z.ZodRawShape>(
  def: AlertActionTypeDefinition<TId, z.ZodObject<TShape>>
) => {
  const fullSchema = z.object({
    action_type: z.literal(def.id).describe(def.description),
    ...def.bodySchema.shape,
  });

  const routeBodySchema = def.bodySchema.strict();

  return {
    ...def,
    pathSuffix: def.pathSuffix ?? `_${def.id}`,
    esMappings: def.esMappings ?? {},
    fullSchema,
    routeBodySchema,
  };
};
