/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';

const PLACEMENT_KEYS: ReadonlySet<string> = new Set(['grid', 'panelId']);

type OptionalField<TField extends z.core.SomeType> = TField extends z.ZodOptional
  ? TField
  : z.ZodOptional<TField>;

/** Type of the merged shape built by `toUpsertContentSchema`. */
type UpsertContentShape<TAddShape extends z.ZodRawShape, TEditShape extends z.ZodRawShape> = {
  [TKey in Exclude<
    keyof TAddShape | keyof TEditShape,
    'grid' | 'panelId'
  >]: TKey extends keyof TAddShape
    ? TKey extends keyof TEditShape
      ? TEditShape[TKey] extends z.ZodOptional
        ? OptionalField<TAddShape[TKey]>
        : TAddShape[TKey]
      : OptionalField<TAddShape[TKey]>
    : TKey extends keyof TEditShape
    ? OptionalField<TEditShape[TKey]>
    : never;
};

const isOptional = (field: z.core.$ZodType): boolean => z.safeParse(field, undefined).success;

/**
 * Merges a kind's add and edit inputs into one content shape for upsert items, which create or
 * edit depending on whether the panel id exists. Placement fields (`grid`, `panelId`) are left
 * out, add descriptions win, and a field stays required only when both inputs require it. Upsert
 * re-parses the content with the add or edit input once it knows which one applies.
 */
const toUpsertContentSchema = <TAddShape extends z.ZodRawShape, TEditShape extends z.ZodRawShape>(
  addShape: TAddShape,
  editShape: TEditShape
): z.ZodObject<UpsertContentShape<TAddShape, TEditShape>> => {
  const contentKeys = [...new Set([...Object.keys(addShape), ...Object.keys(editShape)])].filter(
    (key) => !PLACEMENT_KEYS.has(key)
  );
  // The entries are built at runtime, so the shape type is restated.
  return z.object(
    Object.fromEntries(
      contentKeys.map((key) => {
        const addField = addShape[key];
        const editField = editShape[key];
        const field = addField ?? editField;
        const isRequired =
          addField !== undefined &&
          editField !== undefined &&
          !isOptional(addField) &&
          !isOptional(editField);
        return [key, isRequired || isOptional(field) ? field : z.optional(field)];
      })
    )
  ) as z.ZodObject<UpsertContentShape<TAddShape, TEditShape>>;
};

interface PanelKindDefinition<TAddShape extends z.ZodRawShape, TEdit extends z.ZodObject> {
  /** Embeddable type panels of this kind are stored as. Edits may only target panels of this type. */
  readonly embeddableType: string;
  /** Human-readable name used in errors and descriptions, e.g. "anomaly charts". */
  readonly label: string;
  /** Input that creates a panel of this kind. */
  readonly addInputSchema: z.ZodObject<TAddShape>;
  /** Input that edits an existing panel of this kind by id. */
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
 * in `panels/index.ts` derives the input schemas and lookups from it.
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
  upsertContentSchema: toUpsertContentSchema<TAddShape, TEdit['shape']>(
    kind.addInputSchema.shape,
    kind.editInputSchema.shape
  ),
});

/**
 * Defines a server-generated panel kind. Its module is the only place the kind is described; the
 * registry in `panels/index.ts` derives the input schemas and lookups from it.
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
  upsertContentSchema: toUpsertContentSchema<TAddShape, TEdit['shape']>(
    kind.addInputSchema.shape,
    kind.editInputSchema.shape
  ),
});
