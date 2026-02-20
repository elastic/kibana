/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { ToolUiEvent } from '@kbn/agent-builder-common/chat';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_ADDED_EVENT,
  DASHBOARD_PANELS_REMOVED_EVENT,
} from './constants';

/**
 * Zod schema for Lens panel entries.
 */
export const lensAttachmentPanelSchema = z.object({
  type: z.literal('lens'),
  panelId: z.string(),
  /** The visualization configuration in Lens API format (LensApiSchemaType) */
  visualization: z.record(z.unknown()),
  /** Panel title */
  title: z.string().optional(),
  /** Natural language query that created this (if agent-generated) */
  query: z.string().optional(),
  /** ES|QL query used (if applicable) */
  esql: z.string().optional(),
});

/**
 * A Lens panel entry containing full visualization configuration in API format.
 * All Lens panels (whether created by the agent or extracted from existing dashboards)
 * are stored in this unified format using LensApiSchemaType.
 */
export type LensAttachmentPanel = z.infer<typeof lensAttachmentPanelSchema>;

/**
 * Zod schema for generic (non-Lens) panel entries.
 * The `type` field contains the actual embeddable type.
 */
export const genericAttachmentPanelSchema = z.object({
  /** The actual embeddable type (e.g., 'DASHBOARD_MARKDOWN', 'aiOpsLogRateAnalysis', 'lens' for unsupported) */
  type: z.string(),
  panelId: z.string(),
  /** The raw panel configuration for recreating the panel */
  rawConfig: z.record(z.unknown()),
  /** Panel title if available */
  title: z.string().optional(),
});

/**
 * A non-Lens panel entry containing the raw embeddable configuration.
 * Used for markdown, maps, TSVB, and other panel types, as well as
 * Lens panels with unsupported chart types that can't be converted to API format.
 */
export type GenericAttachmentPanel = z.infer<typeof genericAttachmentPanelSchema>;

/**
 * Zod schema for dashboard panel entries.
 */
export const attachmentPanelSchema = z.union([
  lensAttachmentPanelSchema,
  genericAttachmentPanelSchema,
]);

/**
 * Union type for dashboard panel entries.
 * - LensAttachmentPanel: Lens visualization with config in API format (type: 'lens')
 * - GenericAttachmentPanel: Non-Lens panels with raw config (type: actual embeddable type)
 */
export type AttachmentPanel = z.infer<typeof attachmentPanelSchema>;

/**
 * Type guard to check if a panel is a Lens panel.
 */
export function isLensAttachmentPanel(panel: AttachmentPanel): panel is LensAttachmentPanel {
  return panel.type === 'lens' && 'visualization' in panel;
}

/**
 * Type guard to check if a panel is a generic (non-Lens) panel.
 */
export function isGenericAttachmentPanel(panel: AttachmentPanel): panel is GenericAttachmentPanel {
  return 'rawConfig' in panel;
}

/**
 * Zod schema for a dashboard section containing panels.
 */
export const dashboardSectionSchema = z.object({
  /** Section title */
  title: z.string(),
  /** Panels within this section */
  panels: z.array(attachmentPanelSchema),
});

/**
 * A dashboard section containing panels.
 */
export type DashboardSection = z.infer<typeof dashboardSectionSchema>;

/**
 * Zod schema for dashboard attachment data.
 */
export const dashboardAttachmentDataSchema = z.object({
  title: z.string(),
  description: z.string(),
  /** Optional saved object ID if the dashboard was saved */
  savedObjectId: z.string().optional(),
  /** Array of top-level panel entries */
  panels: z.array(attachmentPanelSchema),
  /** Optional array of sections containing grouped panels */
  sections: z.array(dashboardSectionSchema).optional(),
});

/**
 * Data for a dashboard attachment.
 */
export type DashboardAttachmentData = z.infer<typeof dashboardAttachmentDataSchema>;

/**
 * Data payload for a panel added event.
 */
export interface PanelAddedEventData {
  dashboardAttachmentId: string;
  panel: AttachmentPanel;
}

/**
 * Data payload for a panel removed event.
 */
export interface PanelsRemovedEventData {
  dashboardAttachmentId: string;
  panelIds: string[];
}

/**
 * Union type for dashboard UI events.
 */
export type DashboardUiEvent =
  | ToolUiEvent<typeof DASHBOARD_PANEL_ADDED_EVENT, PanelAddedEventData>
  | ToolUiEvent<typeof DASHBOARD_PANELS_REMOVED_EVENT, PanelsRemovedEventData>;

export type DashboardAttachment = Attachment<
  typeof DASHBOARD_ATTACHMENT_TYPE,
  DashboardAttachmentData
>;
