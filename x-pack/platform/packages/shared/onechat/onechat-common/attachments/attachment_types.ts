/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

/**
 * List of internal / built-in attachment types.
 *
 * The list is not fixed, as contributors can add their own attachment types.
 */
export enum AttachmentType {
  screenContext = 'screen_context',
  text = 'text',
  esql = 'esql',
  visualization = 'visualization',
  /** Reference to a saved visualization - read-only, resolves content on read */
  visualizationRef = 'visualization_ref',
}

interface AttachmentDataMap {
  [AttachmentType.esql]: EsqlAttachmentData;
  [AttachmentType.text]: TextAttachmentData;
  [AttachmentType.screenContext]: ScreenContextAttachmentData;
  [AttachmentType.visualization]: VisualizationAttachmentData;
  [AttachmentType.visualizationRef]: VisualizationRefAttachmentData;
}

export const esqlAttachmentDataSchema = z.object({
  query: z.string(),
  description: z.string().optional(),
});

/**
 * Data for an esql attachment.
 */
export interface EsqlAttachmentData {
  /** the esql query */
  query: string;
  /** optional description of the query */
  description?: string;
}

export const textAttachmentDataSchema = z.object({
  content: z.string(),
});

/**
 * Data for a text attachment.
 */
export interface TextAttachmentData {
  /** text content of the attachment */
  content: string;
}

export const screenContextAttachmentDataSchema = z
  .object({
    url: z.string().optional(),
    app: z.string().optional(),
    description: z.string().optional(),
    additional_data: z.record(z.string()).optional(),
  })
  .refine((data) => {
    // at least one of the fields must be present
    return data.url || data.app || data.description || data.additional_data;
  });

/**
 * Data for a screen context attachment.
 */
export interface ScreenContextAttachmentData {
  /** current url */
  url?: string;
  /** kibana app name */
  app?: string;
  /** app description */
  description?: string;
  /** arbitrary additional context data */
  additional_data?: Record<string, string>;
}

export const visualizationAttachmentDataSchema = z.object({
  visualization: z.record(z.unknown()),
  chart_type: z.string().optional(),
  esql: z.string().optional(),
  description: z.string().optional(),
});

/**
 * Data for a visualization attachment.
 * Contains the Lens configuration for rendering a chart.
 */
export interface VisualizationAttachmentData {
  /** The Lens visualization configuration */
  visualization: Record<string, unknown>;
  /** The chart type (e.g., 'bar', 'line', 'pie') */
  chart_type?: string;
  /** The ES|QL query used to generate the data */
  esql?: string;
  /** Optional description of the visualization */
  description?: string;
}

/**
 * Supported saved object types for visualization references.
 */
export type VisualizationRefSavedObjectType = 'lens' | 'visualization' | 'map';

export const visualizationRefAttachmentDataSchema = z.object({
  // Reference data
  saved_object_id: z.string(),
  saved_object_type: z.enum(['lens', 'visualization', 'map']),
  // Cached metadata (for display without resolution)
  title: z.string().optional(),
  description: z.string().optional(),
  // Resolution tracking
  last_resolved_at: z.string().nullable().optional(),
  // Cached resolved content (filled on read)
  resolved_content: z.unknown().optional(),
});

/**
 * Data for a visualization reference attachment.
 * Contains a reference to a saved visualization object.
 * Content is resolved on-demand when the attachment is read.
 */
export interface VisualizationRefAttachmentData {
  /** ID of the saved object being referenced */
  saved_object_id: string;
  /** Type of saved object */
  saved_object_type: VisualizationRefSavedObjectType;
  /** Cached title from saved object (for display) */
  title?: string;
  /** Cached description */
  description?: string;
  /** When the reference was last resolved */
  last_resolved_at?: string | null;
  /** Resolved content (populated on read) */
  resolved_content?: unknown;
}

export type AttachmentDataOf<Type extends AttachmentType> = AttachmentDataMap[Type];
