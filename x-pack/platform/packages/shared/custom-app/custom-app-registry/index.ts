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
  getAction,
  getActionHandler,
  getCapability,
  getCapabilityViewLoader,
  listActions,
  listActionUiProviders,
  listCapabilities,
  listDocumentResolvers,
  listEmbeddableDocs,
  registerAction,
  registerCapability,
  registerDocumentResolver,
  registerEmbeddableDoc,
} from './capability_registry';
export type { AnyAction, AnyCapability, CapabilityViewLoader } from './capability_registry';
export { defineAction } from './define_action';
export type {
  ActionManifest,
  ActionOf,
  ActionOfShape,
  ActionValidationContext,
} from './define_action';
export type { ActionHandler, ActionHandlerContext } from './action_handler';
export { ActionUiBridge, useActionUis } from './action_ui';
export type { ActionUiApi, ActionUiHost, ActionUiProvider } from './action_ui';
export { actionSchema, getActionSchemas } from './action_schema';
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

/**
 * The actions that can be defined. Like the nodes, it is declared here, and not re-exported,
 * because that is the module an augmentation names: an action adds itself with
 * `declare module '@kbn/custom-app-registry' { interface ActionTypeMap { … } }`.
 */
export interface ActionTypeMap {
  /** Never a type of action: an interface cannot be empty. */
  readonly __none?: never;
}

type RegisteredActionType = Exclude<keyof ActionTypeMap, '__none'>;

/** What any action is, whatever its type, for code that registers none and so knows none. */
export interface GenericAction {
  type: string;
  [prop: string]: unknown;
}

/** An action of any type that has been defined, or a generic one when none are known here. */
export type Action = [RegisteredActionType] extends [never]
  ? GenericAction
  : ActionTypeMap[RegisteredActionType];
export type ActionType = RegisteredActionType;
