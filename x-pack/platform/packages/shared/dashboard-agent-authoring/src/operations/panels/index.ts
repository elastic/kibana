/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';
import type { PanelContent, PanelContentAttempt } from '../../resolve_panel';
import type { ConfigPanelKind, RequestPanelKind } from './panel_kind';
import {
  isEsqlLensPanel,
  lensPanelKind,
  vegaPanelKind,
  type VisPanelResolutionRequest,
} from './vis';
import { markdownPanelKind } from './markdown';
import { customContentPanelKind, type CustomContentPanelResolutionRequest } from './custom_content';
import {
  anomalyChartsPanelKind,
  anomalySwimlanePanelKind,
  singleMetricViewerPanelKind,
} from './ml_panels';
import { attachmentPanelInputSchema } from './attachment_source';

/**
 * Panel kind registry.
 *
 * Panel inputs are discriminated by `source`:
 * - `'request'`: generated server-side, discriminated by `renderer`
 *   (`lens` — the default when omitted —, `vega`, or `custom_content`).
 * - `'config'`: authored by value, discriminated by `type`.
 * - `'attachment'`: an existing visualization attachment from the conversation.
 *
 * Each kind's module describes it once, with `defineConfigPanelKind` or `defineRequestPanelKind`.
 * Registering it in one of the lists below derives its members of the input schemas, the
 * embeddable-type lookups, and the type lists in descriptions and errors. List order is the
 * order of the schema unions sent to the model.
 */
export { attachmentPanelInputSchema } from './attachment_source';
export type { AttachmentPanelInput } from './attachment_source';
export type { VisPanelResolutionRequest } from './vis';
export type {
  CustomContentPanelAddRequest,
  CustomContentPanelEditRequest,
  CustomContentPanelResolutionRequest,
} from './custom_content';

const CONFIG_PANEL_KINDS = [
  markdownPanelKind,
  anomalyChartsPanelKind,
  anomalySwimlanePanelKind,
  singleMetricViewerPanelKind,
] as const;

/**
 * The `satisfies` check makes a request kind whose renderer has no `PanelResolutionRequest`
 * fail to compile, so the host can resolve every request kind.
 */
const REQUEST_PANEL_KINDS = [
  lensPanelKind,
  vegaPanelKind,
  customContentPanelKind,
] as const satisfies ReadonlyArray<{ readonly renderer: PanelRenderer }>;

/**
 * `z.discriminatedUnion` expects a non-empty tuple, while `Array.map` returns a plain array.
 * Only called with the kind lists above, which are never empty.
 */
const toNonEmpty = <T>([first, ...rest]: readonly T[]): [T, ...T[]] => [first, ...rest];

const configPanelInputSchema = z.discriminatedUnion(
  'type',
  toNonEmpty(CONFIG_PANEL_KINDS.map(({ addInputSchema }) => addInputSchema))
);

export type ConfigPanelInput = z.infer<typeof configPanelInputSchema>;

const configPanelKindByType = new Map<ConfigPanelInput['type'], ConfigPanelKind>(
  CONFIG_PANEL_KINDS.map((kind) => [kind.type, kind])
);

const getConfigPanelKind = (type: ConfigPanelInput['type']): ConfigPanelKind => {
  const kind = configPanelKindByType.get(type);
  if (!kind) {
    throw new Error(`Panel type "${type}" is not registered.`);
  }
  return kind;
};

/** Builds panel content from a by-value panel's `type` and `config`. */
export const buildConfigPanelContent = (
  type: ConfigPanelInput['type'],
  config: AttachmentPanel['config']
): PanelContent => {
  const { embeddableType, toEmbeddableConfig } = getConfigPanelKind(type);
  return { type: embeddableType, config: toEmbeddableConfig ? toEmbeddableConfig(config) : config };
};

/** Finds the by-value panel type stored as the given embeddable type, if any. */
export const findConfigPanelType = (
  embeddableType: string
): { type: ConfigPanelInput['type']; label: string } | undefined => {
  const kind = CONFIG_PANEL_KINDS.find((entry) => entry.embeddableType === embeddableType);
  return kind && { type: kind.type, label: kind.label };
};

/** A new-panel input: a by-value config, a request to resolve, or a visualization attachment. */
export const newPanelInputSchema = z.discriminatedUnion('source', [
  configPanelInputSchema,
  z.discriminatedUnion(
    'renderer',
    toNonEmpty(REQUEST_PANEL_KINDS.map(({ addInputSchema }) => addInputSchema))
  ),
  attachmentPanelInputSchema,
]);

export type NewPanelInput = z.infer<typeof newPanelInputSchema>;

export type PanelRequestInput = Extract<NewPanelInput, { source: 'request' }>;

/** An edit of an existing panel, identified by `panelId`. */
export const editPanelInputSchema = z.discriminatedUnion('source', [
  z.discriminatedUnion(
    'renderer',
    toNonEmpty(REQUEST_PANEL_KINDS.map(({ editInputSchema }) => editInputSchema))
  ),
  z.discriminatedUnion(
    'type',
    toNonEmpty(CONFIG_PANEL_KINDS.map(({ editInputSchema }) => editInputSchema))
  ),
]);

export type EditPanelInput = z.infer<typeof editPanelInputSchema>;

export type EditPanelRequestInput = Extract<EditPanelInput, { source: 'request' }>;

/**
 * Panel content of an upsert item: the create and edit fields of any panel kind, without
 * placement. Upsert re-parses it with `newPanelInputSchema` or `editPanelInputSchema` once it
 * knows whether the panel exists.
 */
export const upsertPanelContentSchema = z.discriminatedUnion('source', [
  z.discriminatedUnion(
    'type',
    toNonEmpty(CONFIG_PANEL_KINDS.map(({ upsertContentSchema }) => upsertContentSchema))
  ),
  z.discriminatedUnion(
    'renderer',
    toNonEmpty(REQUEST_PANEL_KINDS.map(({ upsertContentSchema }) => upsertContentSchema))
  ),
  attachmentPanelInputSchema.omit({ grid: true }),
]);

export type UpsertPanelContent = z.infer<typeof upsertPanelContentSchema>;

/**
 * Embeddable types an upsert content can edit in place. A request without a renderer edits Lens or
 * Vega panels. Attachment content always replaces the panel content.
 */
export const getEditableEmbeddableTypes = (content: UpsertPanelContent): string[] => {
  if (content.source === 'config') {
    return [getConfigPanelKind(content.type).embeddableType];
  }
  if (content.source === 'attachment') {
    return [];
  }
  const { renderer } = content;
  return renderer
    ? [getRendererEmbeddableType(renderer)]
    : [lensPanelKind.embeddableType, vegaPanelKind.embeddableType];
};

/**
 * Whether upsert content edits the existing panel in place rather than replacing it: the content
 * matches the panel's kind, and a Lens panel is backed by ES|QL.
 */
export const canEditPanel = (
  content: UpsertPanelContent,
  existingPanel: AttachmentPanel
): boolean =>
  getEditableEmbeddableTypes(content).includes(existingPanel.type) &&
  (existingPanel.type !== lensPanelKind.embeddableType || isEsqlLensPanel(existingPanel));

/** Every panel resolution request the resolver can receive, discriminated by `renderer`. */
export type PanelResolutionRequest =
  | VisPanelResolutionRequest
  | CustomContentPanelResolutionRequest;

/** Engine that renders a `source: 'request'` panel. */
export type PanelRenderer = NonNullable<PanelResolutionRequest['renderer']>;

/** The renderers that have a request kind. */
type RegisteredPanelRenderer = (typeof REQUEST_PANEL_KINDS)[number]['renderer'];

/**
 * Keyed by `RegisteredPanelRenderer`, so passing a `PanelRenderer` to `get` below fails to compile
 * when a resolution request's renderer has no request kind.
 */
const requestPanelKindByRenderer = new Map<RegisteredPanelRenderer, RequestPanelKind>(
  REQUEST_PANEL_KINDS.map((kind) => [kind.renderer, kind])
);

/**
 * Embeddable type a renderer's panels are stored as. With `findPanelRenderer`, this is the only
 * mapping between renderers and panel types: upsert uses it to decide an existing panel's
 * renderer once, and resolvers trust the `renderer` they receive.
 */
export const getRendererEmbeddableType = (renderer: PanelRenderer): string => {
  const kind = requestPanelKindByRenderer.get(renderer);
  if (!kind) {
    throw new Error(`Panel renderer "${renderer}" is not registered.`);
  }
  return kind.embeddableType;
};

/** Finds the renderer whose panels are stored as the given embeddable type, if any. */
export const findPanelRenderer = (embeddableType: string): PanelRenderer | undefined =>
  REQUEST_PANEL_KINDS.find((kind) => kind.embeddableType === embeddableType)?.renderer;

/**
 * Contract for inline panel content resolution. Dashboard authoring consumes this
 * to turn a panel resolution request into panel content. The host implements it
 * by routing each request to the resolver for its `renderer`; it is injected so
 * authoring stays host-agnostic and tests can supply a fake.
 */
export type ResolvePanelContent = (request: PanelResolutionRequest) => Promise<PanelContentAttempt>;
