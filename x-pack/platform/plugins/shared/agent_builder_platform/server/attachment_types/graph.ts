/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { ComponentsNode } from '@kbn/isomer-components';
import { i18n } from '@kbn/i18n';
import type { GraphAttachment, GraphAttachmentData, GraphEdge } from '../../common/attachments';
import { GRAPH_ATTACHMENT_TYPE, graphAttachmentDataSchema } from '../../common/attachments';

export const createGraphAttachmentType = (): AttachmentTypeDefinition<
  typeof GRAPH_ATTACHMENT_TYPE,
  GraphAttachmentData
> => {
  return {
    id: GRAPH_ATTACHMENT_TYPE,
    validate: (input) => {
      const parseResult = graphAttachmentDataSchema.safeParse(input);

      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }

      return { valid: false, error: parseResult.error.message };
    },
    format: (attachment: GraphAttachment) => {
      return {
        getRepresentation: () => ({
          type: 'text' as const,
          value: formatGraphAttachment(attachment.data),
        }),
      };
    },
    /**
     * The graph as a table of its relationships, by node label, followed by the nodes that have none.
     */
    toSurfaceComposition: ({ data: { title, description, nodes, edges } }) => {
      const labels = new Map(nodes.map(({ id, data }) => [id, data.label]));
      const toCell = (id: string) => labels.get(id) || id;

      const hasRelationshipLabels = edges.some(({ label }) => label);

      const relationships: ComponentsNode[] =
        edges.length > 0
          ? [
              {
                type: 'table',
                columns: [
                  {
                    label: i18n.translate(
                      'xpack.agentBuilderPlatform.attachments.graph.surface.from',
                      {
                        defaultMessage: 'From',
                      }
                    ),
                  },
                  ...(hasRelationshipLabels
                    ? [
                        {
                          label: i18n.translate(
                            'xpack.agentBuilderPlatform.attachments.graph.surface.relationship',
                            { defaultMessage: 'Relationship' }
                          ),
                        },
                      ]
                    : []),
                  {
                    label: i18n.translate(
                      'xpack.agentBuilderPlatform.attachments.graph.surface.to',
                      {
                        defaultMessage: 'To',
                      }
                    ),
                  },
                ],
                rows: edges.map(({ source, target, label }) => [
                  toCell(source),
                  ...(hasRelationshipLabels ? [label || null] : []),
                  toCell(target),
                ]),
              },
            ]
          : [];

      const connected = new Set(edges.flatMap(({ source, target }) => [source, target]));
      const unconnected = nodes.filter(({ id }) => !connected.has(id));

      const otherNodes: ComponentsNode[] =
        unconnected.length > 0
          ? [
              {
                type: 'table',
                columns: [
                  {
                    label:
                      edges.length > 0
                        ? i18n.translate(
                            'xpack.agentBuilderPlatform.attachments.graph.surface.unconnectedNode',
                            { defaultMessage: 'Not connected' }
                          )
                        : i18n.translate(
                            'xpack.agentBuilderPlatform.attachments.graph.surface.node',
                            {
                              defaultMessage: 'Node',
                            }
                          ),
                  },
                ],
                rows: unconnected.map(({ id }) => [toCell(id)]),
              },
            ]
          : [];

      return {
        type: 'view',
        title:
          title ||
          i18n.translate('xpack.agentBuilderPlatform.attachments.graph.surface.title', {
            defaultMessage: 'Graph',
          }),
        ...(description ? { subtitle: description } : {}),
        body: [...relationships, ...otherNodes],
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
