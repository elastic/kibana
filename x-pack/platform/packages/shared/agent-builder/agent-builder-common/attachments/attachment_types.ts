/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

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
  connector = 'connector',
}

interface AttachmentDataMap {
  [AttachmentType.esql]: EsqlAttachmentData;
  [AttachmentType.text]: TextAttachmentData;
  [AttachmentType.screenContext]: ScreenContextAttachmentData;
  [AttachmentType.visualization]: VisualizationAttachmentData;
  [AttachmentType.connector]: ConnectorAttachmentData;
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

export const screenContextTimeRangeSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export interface TimeRange {
  from: string;
  to: string;
}

export const screenContextAttachmentDataSchema = z
  .object({
    url: z.string().optional(),
    app: z.string().optional(),
    description: z.string().optional(),
    time_range: screenContextTimeRangeSchema.optional(),
    additional_data: z.record(z.string(), z.string()).optional(),
  })
  .check((ctx) => {
    // at least one of the fields must be present
    const data = ctx.value;
    if (!data.url && !data.app && !data.description && !data.additional_data) {
      ctx.issues.push({
        code: 'custom',
        message: 'At least one of url, app, description, or additional_data must be present',
        input: data,
      });
    }
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
  /** the currently active time range */
  time_range?: TimeRange;
  /** arbitrary additional context data */
  additional_data?: Record<string, string>;
}

export const visualizationTimeRangeSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export const visualizationAttachmentDataSchema = z.object({
  query: z.string(),
  visualization: z.record(z.string(), z.unknown()),
  chart_type: z.string(),
  esql: z.string(),
  time_range: visualizationTimeRangeSchema.optional(),
});

/**
 * Data for a visualization attachment.
 * Same shape for both by-value and resolved by-ref attachments.
 */
export interface VisualizationAttachmentData {
  /** The display query */
  query: string;
  /** Lens API configuration */
  visualization: Record<string, unknown>;
  /** Chart type identifier */
  chart_type: string;
  /** The ES|QL query */
  esql: string;
  /** Optional time range for the visualization (e.g., { from: 'now-24h', to: 'now' }) */
  time_range?: { from: string; to: string };
}

/**
 * Tag prefix used to associate tools with their parent connector instance.
 * A tool tagged `connector:<connectorId>` belongs to that connector.
 */
export const CONNECTOR_TAG_PREFIX = 'connector:';

export const connectorAttachmentToolSchema = z.object({
  tool_id: z.string(),
  description: z.string(),
  configuration: z.object({
    workflow_id: z.string(),
  }),
});

export const connectorAttachmentDataSchema = z.object({
  connector_id: z.string(),
  connector_name: z.string(),
  connector_type: z.string(),
  tools: z.array(connectorAttachmentToolSchema),
});

/**
 * Data for a connector attachment.
 */
export interface ConnectorAttachmentData {
  /** The saved connector instance ID */
  connector_id: string;
  /** Human-readable connector name */
  connector_name: string;
  /** Action type ID (e.g., ".slack2", ".mcp") */
  connector_type: string;
  /** Workflow tools for this connector instance */
  tools: Array<{
    /** Tool ID */
    tool_id: string;
    /** Tool description from workflow YAML */
    description: string;
    /** Tool configuration */
    configuration: {
      /** The workflow ID */
      workflow_id: string;
    };
  }>;
}

export type AttachmentDataOf<Type extends AttachmentType> = AttachmentDataMap[Type];
