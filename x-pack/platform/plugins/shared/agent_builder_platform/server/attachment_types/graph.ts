/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';

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

const graphAttachmentDataSchema = z.looseObject({
  nodes: z.array(graphNodeSchema).min(1),
  edges: z.array(graphEdgeSchema),
  title: z.string().optional(),
  description: z.string().optional(),
});

export type GraphNode = z.infer<typeof graphNodeSchema>;
export type GraphEdge = z.infer<typeof graphEdgeSchema>;
export type GraphAttachmentData = z.infer<typeof graphAttachmentDataSchema>;

export const createGraphAttachmentType = (): AttachmentTypeDefinition<
  AttachmentType.graph,
  GraphAttachmentData
> => {
  return {
    id: AttachmentType.graph,
    validate: (input) => {
      const parseResult = graphAttachmentDataSchema.safeParse(input);

      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }

      return { valid: false, error: parseResult.error.message };
    },
    format: (attachment: Attachment<AttachmentType.graph, GraphAttachmentData>) => {
      return {
        getRepresentation: () => ({
          type: 'text' as const,
          value: formatGraphAttachment(attachment.data),
        }),
      };
    },
    getAgentDescription: () => {
      return 'A graph attachment contains a graph visualization configuration. Use it when you need to represent or discuss entity relationships, dependencies, and graph connectivity in a structured way. Rendering it inline displays the graph as a dynamic, interactive component in the conversation UI.';
    },
    getTools: () => [],
  };
};

const formatGraphAttachment = (data: GraphAttachmentData): string => {
  const header = data.title ? `Graph: ${data.title}` : 'Graph attachment';
  const counts = `Nodes: ${data.nodes.length}, Edges: ${data.edges.length}`;

  const nodes = data.nodes.map((node) => node.data.label).join(', ');
  const edges = data.edges.map((edge) => getEdgeDisplayLabel(edge)).join(', ');

  const lines = [header, counts];

  if (data.description) {
    lines.push(`Description: ${data.description}`);
  }

  if (nodes) {
    lines.push(`Nodes: ${nodes}`);
  }

  if (edges) {
    lines.push(`Edges: ${edges}`);
  }

  return lines.join('\n');
};

const getEdgeDisplayLabel = (edge: GraphEdge): string => {
  const relation = `${edge.source} -> ${edge.target}`;

  return edge.label ? `${relation} (${edge.label})` : relation;
};
