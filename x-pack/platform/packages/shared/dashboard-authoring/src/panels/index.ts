/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';
import type { PanelContent, PanelContentAttempt } from '../resolve_panel';
import { lensPanelKind, vegaPanelKind, type VisPanelResolutionRequest } from './vis';
import { markdownPanelKind } from './markdown';
import { customContentPanelKind, type CustomContentPanelResolutionRequest } from './custom_content';
import {
  anomalyChartsPanelKind,
  anomalySwimlanePanelKind,
  singleMetricViewerPanelKind,
} from './ml_panels';
import { attachmentPanelInputSchema } from './attachment_source';
import type { PanelSizeGuidance } from './panel_kind';

/**
 * Panel kind registry.
 *
 * Panel inputs are discriminated by `source`:
 * - `'request'`: generated server-side, discriminated by `renderer`
 *   (`lens` — the default when omitted —, `vega`, or `custom_content`).
 * - `'config'`: authored by value, discriminated by `type`.
 * - `'attachment'`: an existing visualization attachment from the conversation.
 *
 * Each kind's module describes it once (`defineConfigPanelKind` or `defineRequestPanelKind`). Registering
 * it in one of the lists below derives its members of the input schemas, the
 * embeddable-type lookups, and the type lists in descriptions and errors. List order is the order
 * of the schema unions sent to the model.
 */
export { attachmentPanelInputSchema } from './attachment_source';
export type { AttachmentPanelInput } from './attachment_source';
export type { VisPanelResolutionRequest } from './vis';
export type { PanelKindGuidance, PanelSizeGuidance } from './panel_kind';
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

const REQUEST_PANEL_KINDS = [lensPanelKind, vegaPanelKind, customContentPanelKind] as const;

type ConfigPanelKind = (typeof CONFIG_PANEL_KINDS)[number];
type RequestPanelKind = (typeof REQUEST_PANEL_KINDS)[number];

/** Maps a non-empty kind list onto the non-empty option tuple `z.discriminatedUnion` expects. */
const mapKinds = <TKinds extends readonly [object, ...object[]], TValue>(
  kinds: TKinds,
  pick: (kind: TKinds[number]) => TValue
): [TValue, ...TValue[]] => [pick(kinds[0]), ...kinds.slice(1).map(pick)];

const configPanelInputSchema = z.discriminatedUnion(
  'type',
  mapKinds(CONFIG_PANEL_KINDS, ({ addInputSchema }) => addInputSchema)
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
    mapKinds(REQUEST_PANEL_KINDS, ({ addInputSchema }) => addInputSchema)
  ),
  attachmentPanelInputSchema,
]);

export type NewPanelInput = z.infer<typeof newPanelInputSchema>;

export type PanelRequestInput = Extract<NewPanelInput, { source: 'request' }>;

/** An edit of an existing panel, identified by `panelId`. */
export const editPanelInputSchema = z.discriminatedUnion('source', [
  z.discriminatedUnion(
    'renderer',
    mapKinds(REQUEST_PANEL_KINDS, ({ editInputSchema }) => editInputSchema)
  ),
  z.discriminatedUnion(
    'type',
    mapKinds(CONFIG_PANEL_KINDS, ({ editInputSchema }) => editInputSchema)
  ),
]);

export type EditPanelInput = z.infer<typeof editPanelInputSchema>;

export type EditPanelRequestInput = Extract<EditPanelInput, { source: 'request' }>;

/**
 * Panel content of an `upsert_dashboard` item: the create and edit fields of any panel kind,
 * without placement. Upsert re-parses it with `newPanelInputSchema` or `editPanelInputSchema`
 * once it knows whether the panel exists.
 */
export const upsertPanelContentSchema = z.discriminatedUnion('source', [
  z.discriminatedUnion(
    'type',
    mapKinds(CONFIG_PANEL_KINDS, ({ upsertContentSchema }) => upsertContentSchema)
  ),
  z.discriminatedUnion(
    'renderer',
    mapKinds(REQUEST_PANEL_KINDS, ({ upsertContentSchema }) => upsertContentSchema)
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

/** Every panel resolution request the resolver can receive, discriminated by `renderer`. */
export type PanelResolutionRequest =
  | VisPanelResolutionRequest
  | CustomContentPanelResolutionRequest;

/** Engine that renders a `source: 'request'` panel. */
export type PanelRenderer = RequestPanelKind['renderer'];

const requestPanelKindByRenderer = new Map<PanelRenderer, RequestPanelKind>(
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

const PANEL_KINDS = [...REQUEST_PANEL_KINDS, ...CONFIG_PANEL_KINDS];

/**
 * Size guidance for a stored panel: the entry of its Lens chart type, else its kind default.
 * Undefined for embeddable types no kind creates, such as legacy visualizations.
 */
export const getPanelSizeGuidance = (
  embeddableType: string,
  chartType: string | undefined
): PanelSizeGuidance | undefined => {
  const guidance = PANEL_KINDS.find((kind) => kind.embeddableType === embeddableType)?.guidance;
  if (!guidance) {
    return undefined;
  }
  const chartTypeLayout = chartType
    ? guidance.chartTypeLayouts?.find(({ chartTypes }) => chartTypes.includes(chartType))
    : undefined;
  return chartTypeLayout ?? guidance.layout;
};

/** Every size guidance entry for the layout prompt, once each. */
export const listPanelSizeGuidance = (): PanelSizeGuidance[] => [
  ...new Set(
    PANEL_KINDS.flatMap(({ guidance }) => [guidance.layout, ...(guidance.chartTypeLayouts ?? [])])
  ),
];

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

const formatList = (items: string[]): string =>
  items.length < 3
    ? items.join(' and ')
    : `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;

const getDiscriminator = (kind: (typeof PANEL_KINDS)[number]): string => {
  if (kind.source === 'config') {
    return `\`source: "config"\`, \`type: "${kind.type}"\``;
  }
  const rendererField = kind.addInputSchema.shape.renderer;
  const isDefault = z.safeParse(rendererField, undefined).success;
  return `\`renderer: "${kind.renderer}"\`${isDefault ? ' or omitted' : ''}`;
};

/** The "choose the first panel type that fits" list, from each kind's selection guidance. */
export const buildPanelTypeSelectionGuidance = (): string =>
  PANEL_KINDS.flatMap((kind) => {
    const { selection } = kind.guidance;
    return selection ? [{ kind, selection }] : [];
  })
    .sort((left, right) => left.selection.priority - right.selection.priority)
    .map(
      ({ kind, selection }, index) =>
        `${index + 1}. **${capitalize(kind.label)}** (${getDiscriminator(kind)}) — ${
          selection.whenToUse
        }`
    )
    .join('\n');

/** Labels of the kinds of a source, as an English list, e.g. "Lens, Vega, and custom content". */
export const formatPanelKindLabels = (source: 'request' | 'config'): string =>
  formatList(
    (source === 'request' ? REQUEST_PANEL_KINDS : CONFIG_PANEL_KINDS).map(({ label }) => label)
  );

/**
 * Contract for inline panel content resolution. The generate core consumes this
 * to turn a panel resolution request into panel content. The host implements it
 * by routing each request to the resolver for its `renderer`; it is injected so
 * the core stays host-agnostic and tests can supply a fake.
 */
export type ResolvePanelContent = (request: PanelResolutionRequest) => Promise<PanelContentAttempt>;
