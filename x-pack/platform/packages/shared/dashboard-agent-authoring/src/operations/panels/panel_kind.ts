/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';

const sectionIdField = z
  .string()
  .max(256)
  .optional()
  .describe(
    'Existing section id or the key of an add_section earlier in this call. If omitted, panel is added at the top level.'
  );

/** Adds the `sectionId` that `add_panels` items carry on top of a new-panel input. */
export const withSectionId = <TShape extends z.ZodRawShape>(schema: z.ZodObject<TShape>) =>
  schema.extend({ sectionId: sectionIdField });

interface PanelKindDefinition<TAddShape extends z.ZodRawShape, TEdit extends z.ZodObject> {
  /** Embeddable type panels of this kind are stored as. Edits may only target panels of this type. */
  readonly embeddableType: string;
  /** Human-readable name used in errors and descriptions, e.g. "anomaly charts". */
  readonly label: string;
  /** Input that creates a panel of this kind (`add_section` items). */
  readonly addInputSchema: z.ZodObject<TAddShape>;
  /** Input that edits an existing panel of this kind by id (`edit_panels` items). */
  readonly editInputSchema: TEdit;
}

/** A panel kind the agent authors by value (`source: 'config'`), discriminated by `type`. */
interface ConfigPanelKindDefinition<
  TType extends string,
  TAddShape extends z.ZodRawShape,
  TEdit extends z.ZodObject
> extends PanelKindDefinition<TAddShape, TEdit> {
  readonly type: TType;
  /** Maps the agent-facing config onto the embeddable's stored config. Defaults to passing it through. */
  readonly toEmbeddableConfig?: (config: AttachmentPanel['config']) => AttachmentPanel['config'];
}

/**
 * A panel kind generated server-side (`source: 'request'`), discriminated by `renderer`. The host's
 * `ResolvePanelContent` implementation turns its requests into panel content.
 */
interface RequestPanelKindDefinition<
  TRenderer extends string,
  TAddShape extends z.ZodRawShape,
  TEdit extends z.ZodObject
> extends PanelKindDefinition<TAddShape, TEdit> {
  readonly renderer: TRenderer;
}

/**
 * Defines a by-value panel kind. Its module is the only place the kind is described; the registry
 * in `panels/index.ts` derives the operation schemas and lookups from it.
 */
export const defineConfigPanelKind = <
  TType extends string,
  TAddShape extends z.ZodRawShape,
  TEdit extends z.ZodObject
>(
  kind: ConfigPanelKindDefinition<TType, TAddShape, TEdit>
) => ({
  ...kind,
  source: 'config' as const,
  addPanelsInputSchema: withSectionId(kind.addInputSchema),
});

/**
 * Defines a server-generated panel kind. Its module is the only place the kind is described; the
 * registry in `panels/index.ts` derives the operation schemas and lookups from it.
 */
export const defineRequestPanelKind = <
  TRenderer extends string,
  TAddShape extends z.ZodRawShape,
  TEdit extends z.ZodObject
>(
  kind: RequestPanelKindDefinition<TRenderer, TAddShape, TEdit>
) => ({
  ...kind,
  source: 'request' as const,
  addPanelsInputSchema: withSectionId(kind.addInputSchema),
});
