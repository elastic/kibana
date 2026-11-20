/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { capabilityNodeSchema } from './capability_node_schema';
import { listCapabilities } from './capability_registry';
import type { AppNode } from '.';

/** The schema of each type of node: those of the capabilities registered. */
export const getNodeSchemas = (): readonly z.ZodObject<z.ZodRawShape>[] =>
  listCapabilities().map((capability) =>
    capabilityNodeSchema(capability, () => nodeSchema)
  ) as unknown as readonly z.ZodObject<z.ZodRawShape>[];

/** A node of any type. It is made when it is first used, so that the capabilities are there. */
export const nodeSchema: z.ZodType<AppNode> = z.lazy(
  () => z.discriminatedUnion('type', getNodeSchemas() as never) as unknown as z.ZodType<AppNode>
);
