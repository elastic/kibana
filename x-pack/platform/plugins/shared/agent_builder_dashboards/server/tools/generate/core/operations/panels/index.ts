/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';
import type { PanelContent, PanelContentAttempt } from '../../resolve_panel';
import type { ConfigPanelTypeDefinition } from './config_panel_type';
import {
  lensPanelRequestSchema,
  vegaPanelRequestSchema,
  lensEditPanelRequestSchema,
  vegaEditPanelRequestSchema,
  type VisPanelResolutionRequest,
} from './vis';
import {
  markdownPanelConfigInputSchema,
  editMarkdownPanelConfigInputSchema,
  markdownPanelDefinition,
} from './markdown';
import {
  customContentPanelRequestSchema,
  customContentEditPanelRequestSchema,
  type CustomContentPanelResolutionRequest,
} from './custom_content';
import {
  anomalyChartsPanelConfigInputSchema,
  anomalyChartsPanelDefinition,
  anomalySwimlaneConfigInputSchema,
  anomalySwimlaneDefinition,
  editAnomalyChartsPanelConfigInputSchema,
  editAnomalySwimlaneConfigInputSchema,
  editSingleMetricViewerConfigInputSchema,
  singleMetricViewerConfigInputSchema,
  singleMetricViewerPanelDefinition,
} from './ml_panels';
import { attachmentPanelInputSchema } from './attachment_source';

/**
 * Panel input barrel.
 *
 * Panel inputs are discriminated by `source`:
 * - `'request'`: generated server-side, discriminated by `renderer`
 *   (`lens` — the default when omitted —, `vega`, or `custom_content`).
 * - `'config'`: authored by value, discriminated by `type` (see `CONFIG_PANEL_TYPES`).
 * - `'attachment'`: an existing visualization attachment from the conversation.
 *
 * Each renderer's module owns its request schemas and resolution-request shape;
 * this barrel combines them into the per-operation item schemas and the
 * `ResolvePanelContent` contract.
 */
export { attachmentPanelInputSchema } from './attachment_source';
export type { AttachmentPanelInput } from './attachment_source';
export type { VisPanelResolutionRequest } from './vis';
export type { CustomContentPanelResolutionRequest } from './custom_content';

const sectionIdField = z
  .string()
  .max(256)
  .optional()
  .describe(
    'Existing section id or the key of an add_section earlier in this call. If omitted, panel is added at the top level.'
  );

const configPanelInputSchema = z.discriminatedUnion('type', [
  markdownPanelConfigInputSchema,
  anomalyChartsPanelConfigInputSchema,
  anomalySwimlaneConfigInputSchema,
  singleMetricViewerConfigInputSchema,
]);

export type ConfigPanelInput = z.infer<typeof configPanelInputSchema>;

/**
 * Behavior of every by-value (`source: 'config'`) panel type, keyed by its
 * model-facing `type`: markdown, the ML anomaly panels (swim lane, anomaly
 * charts, single metric viewer), and any other panel type whose config the agent
 * authors directly. Each type registers here, next to its members of the
 * `config` unions. Panels generated server-side belong in the `request` unions
 * instead, with a resolver branch in `core/resolvers/panel_resolver.ts`.
 */
const CONFIG_PANEL_TYPES: Record<ConfigPanelInput['type'], ConfigPanelTypeDefinition> = {
  markdown: markdownPanelDefinition,
  ml_anomaly_charts: anomalyChartsPanelDefinition,
  ml_anomaly_swimlane: anomalySwimlaneDefinition,
  ml_single_metric_viewer: singleMetricViewerPanelDefinition,
};

/** Builds panel content from a by-value panel's `type` and `config`. */
export const buildConfigPanelContent = (
  type: ConfigPanelInput['type'],
  config: AttachmentPanel['config']
): PanelContent => {
  const { embeddableType, toEmbeddableConfig } = CONFIG_PANEL_TYPES[type];
  return { type: embeddableType, config: toEmbeddableConfig ? toEmbeddableConfig(config) : config };
};

/** Returns an error message when a by-value edit targets a panel of a different type. */
export const getConfigPanelEditError = (
  type: ConfigPanelInput['type'],
  existingPanel: AttachmentPanel
): string | undefined => {
  const { embeddableType, label } = CONFIG_PANEL_TYPES[type];
  return existingPanel.type === embeddableType
    ? undefined
    : `Panel "${existingPanel.id}" with type "${existingPanel.type}" cannot be edited as ${label}. Use source: "request" with the panel's renderer for Lens, Vega, or custom content panels.`;
};

/** A single inline panel item accepted by `add_section` (section-relative, no sectionId). */
export const addSectionPanelItemSchema = z.discriminatedUnion('source', [
  configPanelInputSchema,
  z.discriminatedUnion('renderer', [
    lensPanelRequestSchema,
    vegaPanelRequestSchema,
    customContentPanelRequestSchema,
  ]),
  attachmentPanelInputSchema,
]);

/**
 * A "create a new panel" input: a by-value config, a request to resolve, or a
 * visualization attachment. The common shape that `add_panels` and `add_section`
 * materialize into panel content (`add_panels` items also carry a `sectionId`,
 * which is assignable to this base).
 */
export type NewPanelInput = z.infer<typeof addSectionPanelItemSchema>;

export type PanelRequestInput = Extract<NewPanelInput, { source: 'request' }>;

/** A single panel item accepted by `add_panels` (any panel input, optionally targeting a section). */
export const addPanelsItemSchema = z.discriminatedUnion('source', [
  z.discriminatedUnion('type', [
    markdownPanelConfigInputSchema.extend({ sectionId: sectionIdField }),
    anomalyChartsPanelConfigInputSchema.extend({ sectionId: sectionIdField }),
    anomalySwimlaneConfigInputSchema.extend({ sectionId: sectionIdField }),
    singleMetricViewerConfigInputSchema.extend({ sectionId: sectionIdField }),
  ]),
  z.discriminatedUnion('renderer', [
    lensPanelRequestSchema.extend({ sectionId: sectionIdField }),
    vegaPanelRequestSchema.extend({ sectionId: sectionIdField }),
    customContentPanelRequestSchema.extend({ sectionId: sectionIdField }),
  ]),
  attachmentPanelInputSchema.extend({ sectionId: sectionIdField }),
]);

export type AddPanelsItemInput = z.infer<typeof addPanelsItemSchema>;

/** A single panel item accepted by `edit_panels` (targets an existing panel by id). */
export const editPanelItemSchema = z.discriminatedUnion('source', [
  z.discriminatedUnion('renderer', [
    lensEditPanelRequestSchema,
    vegaEditPanelRequestSchema,
    customContentEditPanelRequestSchema,
  ]),
  z.discriminatedUnion('type', [
    editMarkdownPanelConfigInputSchema,
    editAnomalyChartsPanelConfigInputSchema,
    editAnomalySwimlaneConfigInputSchema,
    editSingleMetricViewerConfigInputSchema,
  ]),
]);

export type EditPanelItem = z.infer<typeof editPanelItemSchema>;

export type EditPanelRequestInput = Extract<EditPanelItem, { source: 'request' }>;

/** Every panel resolution request the resolver can receive, discriminated by `renderer`. */
export type PanelResolutionRequest =
  | VisPanelResolutionRequest
  | CustomContentPanelResolutionRequest;

/**
 * Contract for inline panel content resolution. The generate core consumes this
 * to turn a panel resolution request into panel content. The default resolver
 * (see `core/resolvers/panel_resolver.ts`) routes each request to the resolver
 * for its `renderer`; it is injected so tests can supply a fake.
 */
export type ResolvePanelContent = (request: PanelResolutionRequest) => Promise<PanelContentAttempt>;
