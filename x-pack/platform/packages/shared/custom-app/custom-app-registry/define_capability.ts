/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';

export type CapabilityBoundKind = 'string' | 'number' | 'boolean';

export interface CapabilityBoundProp {
  /** The property as it is written down, which a value from the state must also be. */
  schema: z.ZodType;
  /** The kind of state key that can set it. */
  kind: CapabilityBoundKind;
}

export interface CapabilityDoc {
  summary: string;
  whenToUse: string;
  example: Record<string, unknown>;
}

export interface CapabilityValidationContext {
  /** Every node of the document. */
  nodes: ReadonlyArray<{ id: string; type: string }>;
  /** Where the node with this id gets what it shows, if it shows data. */
  sourceOf: (nodeId: string) => { type: string } | undefined;
  /** The node that holds the one with this id, if any. */
  parentOf: (nodeId: string) => { id: string; type: string } | undefined;
  /** Reports a problem with the node that is being checked. */
  issue: (message: string) => void;
}

export interface CapabilityManifest<
  Id extends string = string,
  Shape extends z.ZodRawShape = z.ZodRawShape
> {
  kind: 'component';
  id: Id;
  version: number;
  /** The settings of the component, without `type`, `id` and `visibleWhen`, which every node has. */
  props: z.ZodObject<Shape>;
  doc: CapabilityDoc;
  /** The settings whose text may refer to values of the app as `{{state.key}}`. */
  interpolated?: ReadonlyArray<keyof Shape & string>;
  /** The settings that a value of the app can set, with what a value must be. */
  bound?: Readonly<Record<string, CapabilityBoundProp>>;
  /**
   * Where it gets the data it shows. From the runtime, which fetches it: from a query, or from a
   * query or a source of cases. Or its own: it fetches by itself, with the context of the app, as
   * when what it runs is typed by the person using the app. Leave it out for a component with none.
   */
  data?: 'query' | 'query_or_source' | 'own';
  /** That the component holds other components, in `children`. */
  container?: true;
  /** The settings that hold what happens on an event, by the name of the event. */
  events?: Readonly<Record<string, keyof Shape & string>>;
  /** The values of the app that the component reads and writes. */
  bindings?: (node: z.output<z.ZodObject<Shape>>) => string[];
  /** What kind of value the component sets: text unless it says otherwise. */
  bindingType?:
    | 'string'
    | 'list'
    | 'boolean'
    | ((node: z.output<z.ZodObject<Shape>>) => 'string' | 'list' | 'boolean');
  /** Texts of the component, beyond its settings, that may use values of the app. */
  extraText?: (node: z.output<z.ZodObject<Shape>>) => ReadonlyArray<{ prop: string; text: string }>;
  /** Queries of the component other than the one it shows: they run when the id and suffix are asked for. */
  sources?: (
    node: z.output<z.ZodObject<Shape>>
  ) => ReadonlyArray<{ suffix: string; query: string }>;
  /** What is wrong with the component beyond what its settings say, with the whole document in view. */
  validate?: (
    node: z.output<z.ZodObject<Shape>> & { id: string },
    context: CapabilityValidationContext
  ) => void;
  /** Whether the component is opened by an action and draws nothing where it is in the tree. */
  overlay?: boolean;
  /** Whether the component goes to the end of a row, and takes only the room it needs there. */
  alignEnd?: boolean;
  /** Whether the values it sets are typed text, which does not belong in a link. */
  private?: boolean;
  /** Whether the component is a filter, and so sits with the others in a bar. */
  filter?: boolean;
  /** Whether the component takes only the room it needs in a row, as a status or a button does. */
  compact?: boolean;
  /** One step for each version after the first: turns the settings of version N into those of N + 1. */
  migrations?: Readonly<
    Record<number, (props: Record<string, unknown>) => Record<string, unknown>>
  >;
}

export const defineCapability = <Id extends string, Shape extends z.ZodRawShape>(
  manifest: CapabilityManifest<Id, Shape>
): CapabilityManifest<Id, Shape> => manifest;
