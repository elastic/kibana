/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { Attachment, GraphEdge } from '@kbn/agent-builder-common/attachments';
import {
  AttachmentType,
  graphAttachmentDataSchema,
  type GraphAttachmentData,
} from '@kbn/agent-builder-common/attachments';

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
  const edgeLabel = (edge as { label?: string }).label;
  const relation = `${edge.source} -> ${edge.target}`;
  return edgeLabel ? `${relation} (${edgeLabel})` : relation;
};
