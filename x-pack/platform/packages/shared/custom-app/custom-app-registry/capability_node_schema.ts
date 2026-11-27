/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_CHILDREN_PER_NODE } from './constants';
import { nodeIdSchema, visibleWhenSchema } from './node_envelope';
import type { CapabilityManifest } from './define_capability';

/** The node of a capability: what every node has, and the settings of the capability. */
export type CapabilityNode<Id extends string, Shape extends z.ZodRawShape> = z.output<
  z.ZodObject<
    {
      type: z.ZodLiteral<Id>;
      id: typeof nodeIdSchema;
      visibleWhen: typeof visibleWhenSchema;
    } & Shape
  >
>;

/** The node of a capability, from its manifest. */
export type CapabilityNodeOf<Manifest> = Manifest extends CapabilityManifest<infer Id, infer Shape>
  ? CapabilityNode<Id, Shape>
  : never;

const schemas = new WeakMap<object, z.ZodType>();

/**
 * The schema of a node of a capability, made once for each. A capability that holds other
 * components gets `children`, each of any type, from the schema that is given for a node.
 */
export const capabilityNodeSchema = <Id extends string, Shape extends z.ZodRawShape>(
  manifest: CapabilityManifest<Id, Shape>,
  nodeSchema?: () => z.ZodType
) => {
  const known = schemas.get(manifest);
  if (known) return known as unknown as ReturnType<typeof createNodeSchema<Id, Shape>>;
  const created = createNodeSchema(manifest, nodeSchema);
  schemas.set(manifest, created);
  return created;
};

const createNodeSchema = <Id extends string, Shape extends z.ZodRawShape>(
  manifest: CapabilityManifest<Id, Shape>,
  nodeSchema?: () => z.ZodType
) => {
  const shape = {
    type: z.literal(manifest.id),
    id: nodeIdSchema,
    visibleWhen: visibleWhenSchema,
    ...manifest.props.shape,
  };
  if (!manifest.container || !nodeSchema) return z.object(shape);
  return z.object({
    ...shape,
    get children(): z.ZodArray<z.ZodType> {
      return z.array(nodeSchema()).max(MAX_CHILDREN_PER_NODE);
    },
  });
};
