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
  applicationContext = 'application_context',
  timeRange = 'time_range',
  text = 'text',
  esql = 'esql',
}

interface AttachmentDataMap {
  [AttachmentType.esql]: EsqlAttachmentData;
  [AttachmentType.text]: TextAttachmentData;
  [AttachmentType.applicationContext]: ApplicationContextAttachmentData;
  [AttachmentType.timeRange]: TimerangeAttachmentData;
}

export const timeRangeAttachmentDataSchema = z.object({
  start: z.string(),
  end: z.string(),
  description: z.string().optional(),
});

/**
 * Data for an esql attachment.
 */
export interface TimerangeAttachmentData {
  /** start of the timerange in ISO format */
  start: string;
  /** end of the timerange in ISO format */
  end: string;
  /** optional description of what the timerange is for */
  description?: string;
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

export const applicationContextAttachmentDataSchema = z
  .object({
    location: z.string().optional(),
    app_id: z.string().optional(),
    description: z.string().optional(),
  })
  .refine((data) => {
    // at least one of the fields must be present
    return data.location || data.app_id || data.description;
  });

/**
 * Data for a screen context attachment.
 */
export interface ApplicationContextAttachmentData {
  /** current location */
  location?: string;
  /** kibana app name */
  app_id?: string;
  /** app description */
  description?: string;
}

export type AttachmentDataOf<Type extends AttachmentType> = AttachmentDataMap[Type];
