/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { CapabilityDoc } from './define_capability';

export interface ActionValidationContext {
  /** The node that has the action, and the event that runs it. */
  nodeId: string;
  event: string;
  /** Whether a value taken from a clicked row or from an input makes sense for this event. */
  allowed: { fromColumn: boolean; fromInput: boolean };
  /** The values the app declares. */
  state: Readonly<Record<string, { type: string; default: unknown }>>;
  /** The ids of the components that are opened by an action, such as flyouts. */
  overlayIds: ReadonlySet<string>;
  /** Reports a problem with the node that has the action. */
  issue: (message: string) => void;
}

/** The action of a manifest: its settings, and the `type` that says which action it is. */
export type ActionOfShape<Id extends string, Shape extends z.ZodRawShape> = z.output<
  z.ZodObject<{ type: z.ZodLiteral<Id> } & Shape>
>;

export interface ActionManifest<
  Id extends string = string,
  Shape extends z.ZodRawShape = z.ZodRawShape
> {
  kind: 'action';
  id: Id;
  version: number;
  /** The settings of the action, without `type`. */
  props: z.ZodObject<Shape>;
  doc: CapabilityDoc;
  /** What is wrong with the action beyond what its settings say, with the whole document in view. */
  validate?: (action: ActionOfShape<Id, Shape>, context: ActionValidationContext) => void;
}

/** The action of a manifest. */
export type ActionOf<Manifest> = Manifest extends ActionManifest<infer Id, infer Shape>
  ? ActionOfShape<Id, Shape>
  : never;

export const defineAction = <Id extends string, Shape extends z.ZodRawShape>(
  manifest: ActionManifest<Id, Shape>
): ActionManifest<Id, Shape> => manifest;
