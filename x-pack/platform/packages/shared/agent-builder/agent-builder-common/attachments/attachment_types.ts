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
  visualizationRef = 'visualization_ref',
}

interface AttachmentDataMap {
  [AttachmentType.esql]: EsqlAttachmentData;
  [AttachmentType.text]: TextAttachmentData;
  [AttachmentType.screenContext]: ScreenContextAttachmentData;
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

export const visualizationRefAttachmentDataSchema = z.object({
  saved_object_id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
});

/**
 * Data for a visualization_ref attachment.
 *
 * This attachment does not store the full saved object state, only a reference to a Lens saved
 * object. The content can be resolved on-demand by the server when needed.
 */
export interface VisualizationRefAttachmentData {
  saved_object_id: string;
  title?: string;
  description?: string;
}

export type AttachmentDataOf<Type extends AttachmentType> = AttachmentDataMap[Type];
