/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';

/** The `sectionId` that `add_panels` items carry on top of a new-panel input. */
export const sectionIdField = z
  .string()
  .max(256)
  .optional()
  .describe(
    'Existing section id or the key of an add_section earlier in this call. If omitted, panel is added at the top level.'
  );

interface PanelKindBase {
  /** Embeddable type panels of this kind are stored as. Edits may only target panels of this type. */
  readonly embeddableType: string;
  /** Human-readable name used in errors and descriptions, e.g. "anomaly charts". */
  readonly label: string;
  /** Input that creates a panel of this kind (`add_section` items). */
  readonly addInputSchema: z.ZodObject;
  /** `addInputSchema` extended with `sectionId: sectionIdField` (`add_panels` items). */
  readonly addPanelsInputSchema: z.ZodObject;
  /** Input that edits an existing panel of this kind by id (`edit_panels` items). */
  readonly editInputSchema: z.ZodObject;
}

/** A panel kind the agent authors by value (`source: 'config'`), discriminated by `type`. Declare with `defineConfigPanelKind`. */
export interface ConfigPanelKind extends PanelKindBase {
  readonly source: 'config';
  readonly type: string;
  /** Maps the agent-facing config onto the embeddable's stored config. Defaults to passing it through. */
  readonly toEmbeddableConfig?: (config: AttachmentPanel['config']) => AttachmentPanel['config'];
}

/**
 * A panel kind generated server-side (`source: 'request'`), discriminated by `renderer`. The host's
 * `ResolvePanelContent` implementation turns its requests into panel content. Declare with
 * `defineRequestPanelKind`.
 */
export interface RequestPanelKind extends PanelKindBase {
  readonly source: 'request';
  readonly renderer: string;
}

interface ConfigDiscriminator<Type extends string> {
  source: z.ZodLiteral<'config'>;
  type: z.ZodLiteral<Type>;
}

/**
 * Declares a by-value panel kind. The input schemas must carry the kind's `type` literal, and
 * `addPanelsInputSchema` is derived from `addInputSchema`.
 */
export const defineConfigPanelKind = <
  const Type extends string,
  AddShape extends ConfigDiscriminator<Type> & z.ZodRawShape,
  EditShape extends ConfigDiscriminator<Type> & z.ZodRawShape
>(kind: {
  type: Type;
  embeddableType: string;
  label: string;
  addInputSchema: z.ZodObject<AddShape>;
  editInputSchema: z.ZodObject<EditShape>;
  toEmbeddableConfig?: ConfigPanelKind['toEmbeddableConfig'];
}) =>
  ({
    source: 'config',
    ...kind,
    addPanelsInputSchema: kind.addInputSchema.extend({ sectionId: sectionIdField }),
  } as const satisfies ConfigPanelKind);

/** Lens is the default renderer, so its `renderer` field may be optional. */
type RendererField<Renderer extends string> =
  | z.ZodLiteral<Renderer>
  | z.ZodOptional<z.ZodLiteral<Renderer>>;

interface RequestDiscriminator<Renderer extends string> {
  source: z.ZodLiteral<'request'>;
  renderer: RendererField<Renderer>;
}

/**
 * Declares a server-side generated panel kind. The input schemas must carry the kind's `renderer`
 * literal, and `addPanelsInputSchema` is derived from `addInputSchema`.
 */
export const defineRequestPanelKind = <
  const Renderer extends string,
  AddShape extends RequestDiscriminator<Renderer> & z.ZodRawShape,
  EditShape extends RequestDiscriminator<Renderer> & z.ZodRawShape
>(kind: {
  renderer: Renderer;
  embeddableType: string;
  label: string;
  addInputSchema: z.ZodObject<AddShape>;
  editInputSchema: z.ZodObject<EditShape>;
}) =>
  ({
    source: 'request',
    ...kind,
    addPanelsInputSchema: kind.addInputSchema.extend({ sectionId: sectionIdField }),
  } as const satisfies RequestPanelKind);
