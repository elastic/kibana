/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import { Condition, conditionSchema } from '../../../conditions';

export interface RoutingDefinition {
  destination: string;
  if: Condition;
}

export const routingDefinitionSchema: z.Schema<RoutingDefinition> = z.object({
  destination: NonEmptyString,
  if: conditionSchema,
});

export const routingDefinitionListSchema: z.Schema<RoutingDefinition[]> =
  z.array(routingDefinitionSchema);
