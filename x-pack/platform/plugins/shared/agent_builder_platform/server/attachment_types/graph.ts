/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentTypeDefinition,
  SurfaceComposition,
  SurfaceNode,
} from '@kbn/agent-builder-server/attachments';
import { i18n } from '@kbn/i18n';
import type { GraphAttachment, GraphAttachmentData, GraphEdge } from '../../common/attachments';
import { GRAPH_ATTACHMENT_TYPE, graphAttachmentDataSchema } from '../../common/attachments';
import { SURFACE_LIMITS, toLine } from './surface_helpers';

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
    toSurfaceComposition: ({ data }) => toGraphSurfaceComposition(data),
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

/** A note that `count` more items aren't shown, or nothing when all are. */
const toMoreNote = (count: number): SurfaceNode[] =>
  count > 0
    ? [
        {
          type: 'context',
          items: [
            {
              text: i18n.translate('xpack.agentBuilderPlatform.attachments.graph.surface.more', {
                defaultMessage: '{count, plural, one {# more not shown} other {# more not shown}}',
                values: { count },
              }),
            },
          ],
        },
      ]
    : [];

/**
 * The graph as a table of its relationships, by node label, followed by the nodes that have none.
 * Long graphs show their first rows and count the rest.
 */
const toGraphSurfaceComposition = ({
  title,
  description,
  nodes,
  edges,
}: GraphAttachmentData): SurfaceComposition => {
  const labels = new Map(nodes.map(({ id, data }) => [id, data.label]));
  const toCell = (id: string) => toLine(labels.get(id) || id, SURFACE_LIMITS.tableCell) || null;

  const hasRelationshipLabels = edges.some(({ label }) => label && /\S/.test(label));
  const shownEdges = edges.slice(0, SURFACE_LIMITS.tableRows);

  const relationships: SurfaceNode[] =
    edges.length > 0
      ? [
          {
            type: 'table',
            columns: [
              {
                label: i18n.translate('xpack.agentBuilderPlatform.attachments.graph.surface.from', {
                  defaultMessage: 'From',
                }),
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
                label: i18n.translate('xpack.agentBuilderPlatform.attachments.graph.surface.to', {
                  defaultMessage: 'To',
                }),
              },
            ],
            rows: shownEdges.map(({ source, target, label }) => [
              toCell(source),
              ...(hasRelationshipLabels
                ? [label ? toLine(label, SURFACE_LIMITS.tableCell) || null : null]
                : []),
              toCell(target),
            ]),
          },
          ...toMoreNote(edges.length - shownEdges.length),
        ]
      : [];

  const connected = new Set(edges.flatMap(({ source, target }) => [source, target]));
  const unconnected = nodes.filter(({ id }) => !connected.has(id));
  const shownNodes = unconnected.slice(0, SURFACE_LIMITS.tableRows);

  const otherNodes: SurfaceNode[] =
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
                    : i18n.translate('xpack.agentBuilderPlatform.attachments.graph.surface.node', {
                        defaultMessage: 'Node',
                      }),
              },
            ],
            rows: shownNodes.map(({ id }) => [toCell(id)]),
          },
          ...toMoreNote(unconnected.length - shownNodes.length),
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
};
