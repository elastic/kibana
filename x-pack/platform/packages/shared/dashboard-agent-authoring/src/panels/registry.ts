/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';
import type { PanelContent, PanelContentAttempt } from '../resolve_panel';
import type { ConfigPanelKind, RequestPanelKind } from './panel_kind';
import { lensPanelKind, vegaPanelKind, type VisPanelResolutionRequest } from './vis';
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
 * Each kind's module describes it once, with `defineConfigPanelKind` or `defineRequestPanelKind`,
 * including one content schema that both creates and edits its panels. Registering it in one of
 * the lists below derives its member of the content schema and the embeddable-type lookups. List
 * order is the order of the schema unions sent to the model.
 */

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

/**
 * Panel content of an upsert item: creates a panel of any kind, or edits an existing panel of the
 * same kind.
 */
export const upsertPanelContentSchema = z.discriminatedUnion('source', [
  z.discriminatedUnion(
    'type',
    toNonEmpty(CONFIG_PANEL_KINDS.map(({ contentSchema }) => contentSchema))
  ),
  z.discriminatedUnion(
    'renderer',
    toNonEmpty(REQUEST_PANEL_KINDS.map(({ contentSchema }) => contentSchema))
  ),
  attachmentPanelInputSchema,
]);

export type UpsertPanelContent = z.infer<typeof upsertPanelContentSchema>;

type ConfigPanelContent = Extract<UpsertPanelContent, { source: 'config' }>;

export type PanelRequestContent = Extract<UpsertPanelContent, { source: 'request' }>;

const configPanelKindByType = new Map<ConfigPanelContent['type'], ConfigPanelKind>(
  CONFIG_PANEL_KINDS.map((kind) => [kind.type, kind])
);

const getConfigPanelKind = (type: ConfigPanelContent['type']): ConfigPanelKind => {
  const kind = configPanelKindByType.get(type);
  if (!kind) {
    throw new Error(`Panel type "${type}" is not registered.`);
  }
  return kind;
};

/** Builds panel content from a by-value panel's `type` and `config`. */
export const buildConfigPanelContent = (
  type: ConfigPanelContent['type'],
  config: AttachmentPanel['config']
): PanelContent => {
  const { embeddableType, toEmbeddableConfig } = getConfigPanelKind(type);
  return { type: embeddableType, config: toEmbeddableConfig ? toEmbeddableConfig(config) : config };
};

/** Finds the by-value panel type stored as the given embeddable type, if any. */
export const findConfigPanelType = (
  embeddableType: string
): { type: ConfigPanelContent['type']; label: string } | undefined => {
  const kind = CONFIG_PANEL_KINDS.find((entry) => entry.embeddableType === embeddableType);
  return kind && { type: kind.type, label: kind.label };
};

/**
 * Embeddable types an upsert content can edit. A request without a renderer edits Lens or Vega
 * panels. Attachment content only creates panels.
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
