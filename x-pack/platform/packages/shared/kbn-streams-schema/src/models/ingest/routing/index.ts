/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';
import { conditionSchema } from '@kbn/streamlang';
import { z, lazySchema } from '@kbn/zod/v4';
import { createIsNarrowSchema, NonEmptyString } from '@kbn/zod-helpers/v4';

export const routingStatus = lazySchema(() => z.enum(['enabled', 'disabled']));
export type RoutingStatus = z.infer<typeof routingStatus>;

export interface RoutingDefinition {
  destination: string;
  where: Condition;
  status?: RoutingStatus;
  draft?: boolean;
}

export const routingDefinitionSchema: z.Schema<RoutingDefinition> = lazySchema(() => z.object({
  destination: NonEmptyString,
  where: conditionSchema,
  status: routingStatus.optional(),
  draft: z.boolean().optional(),
}));

export const routingDefinitionListSchema: z.Schema<RoutingDefinition[]> =
  lazySchema(() => z.array(routingDefinitionSchema));

export const isRoutingEnabled = createIsNarrowSchema(routingStatus, z.literal('enabled'));
