/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { defineCapability } from './define_capability';
export type {
  CapabilityBoundKind,
  CapabilityBoundProp,
  CapabilityDoc,
  CapabilityManifest,
  CapabilityValidationContext,
} from './define_capability';
export {
  getCapability,
  getCapabilityViewLoader,
  listCapabilities,
  listDocumentResolvers,
  registerCapability,
  registerDocumentResolver,
} from './capability_registry';
export type { AnyCapability, CapabilityViewLoader } from './capability_registry';
export type {
  CapabilityQueryResult,
  CapabilitySourceState,
  CapabilityViewProps,
} from './capability_view_props';
export type { DocumentResolution, DocumentResolver, ResolvableDocument } from './document_resolver';
export { capabilityNodeSchema } from './capability_node_schema';
export type { CapabilityNode, CapabilityNodeOf } from './capability_node_schema';
export { getNodeSchemas, nodeSchema } from './node_schema';
export { checkCapability } from './check_capability';
export { describeCapability } from './capability_guide';
export { nodeIdSchema, stateKeySchema, visibleWhenSchema } from './node_envelope';
export type { VisibleWhen } from './node_envelope';
export {
  MAX_CHILDREN_PER_NODE,
  MAX_NODE_ID_LENGTH,
  MAX_STATE_KEY_LENGTH,
  MAX_STATE_STRING_LENGTH,
  RESERVED_STATE_KEYS,
} from './constants';

/**
 * Every type of node, by its name. A capability adds its own entry, from the file where it is
 * defined, with a `declare module '@kbn/custom-app-registry'`, so that a new type needs no edit here
 * and a plugin can add one of its own. It is declared in this file, and not re-exported, because
 * that is the module an augmentation names.
 */
export interface NodeTypeMap {
  /** Never a type of node: an interface cannot be empty. */
  readonly __none?: never;
}

type RegisteredType = Exclude<keyof NodeTypeMap, '__none'>;

/**
 * What any node is, whatever its type. Code that works on documents without knowing the types,
 * such as a package that registers none, sees the nodes as this.
 */
export interface GenericNode {
  type: string;
  id: string;
  visibleWhen?: { $state: string; equals?: string | number | boolean };
  children?: GenericNode[];
  [prop: string]: unknown;
}

/** A node of any type that has been defined, or a generic node when none are known here. */
export type AppNode = [RegisteredType] extends [never] ? GenericNode : NodeTypeMap[RegisteredType];
export type AppNodeType = RegisteredType;
export type AppNodeOfType<T extends AppNodeType> = NodeTypeMap[T];
/** The nodes that hold other nodes. */
export type ContainerNode = [RegisteredType] extends [never]
  ? GenericNode & { children: GenericNode[] }
  : Extract<AppNode, { children: unknown }>;
