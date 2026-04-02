/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Attachment } from '@kbn/agent-builder-common/attachments';

export const GRAPH_ATTACHMENT_TYPE = 'graph' as const;

const graphNodeSchema = z.looseObject({
  id: z.string().min(1),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.looseObject({
    label: z.string(),
  }),
});

const graphEdgeSchema = z.looseObject({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  type: z.string().min(1),
  label: z.string().optional(),
  markerEnd: z.enum(['arrow']).optional(),
});

export const graphAttachmentDataSchema = z.looseObject({
  nodes: z.array(graphNodeSchema).min(1),
  edges: z.array(graphEdgeSchema),
  title: z.string().optional(),
  description: z.string().optional(),
});

export type GraphNode = z.infer<typeof graphNodeSchema>;
export type GraphEdge = z.infer<typeof graphEdgeSchema>;
export type GraphAttachmentData = z.infer<typeof graphAttachmentDataSchema>;

export type GraphAttachment = Attachment<typeof GRAPH_ATTACHMENT_TYPE, GraphAttachmentData>;
