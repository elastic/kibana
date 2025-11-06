/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { Edge } from '@xyflow/react';
import type { ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import type { ScratchpadNode } from './use_scratchpad_state';

export interface UseScratchpadScreenContextOptions {
  observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
  nodes: ScratchpadNode[];
  edges: Edge[];
  addNode: (node: ScratchpadNode) => string;
  updateNode: (nodeId: string, updates: Partial<ScratchpadNode>) => void;
  deleteNode: (nodeId: string) => void;
  createEdge: (sourceId: string, targetId: string) => void;
}

export function useScratchpadScreenContext({
  observabilityAIAssistant,
  nodes,
  edges,
  addNode,
  updateNode,
  deleteNode,
  createEdge,
}: UseScratchpadScreenContextOptions) {
  useEffect(() => {
    if (!observabilityAIAssistant) return;

    const {
      service: { setScreenContext },
      createScreenContextAction,
    } = observabilityAIAssistant;

    // Prepare minimal context data (summary only - detailed data available via read actions)
    // Keep under 1000 tokens to be sent automatically
    const contextData = [
      {
        name: 'scratchpad_summary',
        description: 'Summary of the scratchpad graph state',
        value: {
          nodeCount: nodes.length,
          edgeCount: edges.length,
          nodeTypes: {
            esql_query: nodes.filter((n) => n.type === 'esql_query').length,
            text_note: nodes.filter((n) => n.type === 'text_note').length,
            kibana_link: nodes.filter((n) => n.type === 'kibana_link').length,
          },
          // Only include node IDs and types - full details available via read_node action
          nodeIds: nodes.map((n) => ({ id: n.id, type: n.type })),
          // Edge summary
          edges: edges.map((e) => ({ source: e.source, target: e.target })),
        },
      },
    ];

    return setScreenContext({
      screenDescription: `The user is working on a scratchpad with ${nodes.length} node(s) and ${edges.length} connection(s). The scratchpad is a mindmap-style graph where nodes can be ESQL queries, text notes, or links to Kibana locations. Users can add nodes, connect them with edges, and view ESQL query results. Note: To execute ESQL queries, use the built-in "query" function - ESQL query nodes display queries but execution is handled separately.`,
      data: contextData,
      actions: [
        // Read Node Details (bi-directional - returns full node data)
        createScreenContextAction(
          {
            name: 'read_node',
            description:
              'Read the full details of a specific node in the scratchpad. Use this to get complete information about a node including its content, query, results, etc.',
            parameters: {
              type: 'object',
              properties: {
                nodeId: {
                  type: 'string',
                  description: 'The ID of the node to read',
                },
              },
              required: ['nodeId'],
            } as const,
          },
          async ({ args }) => {
            try {
              const node = nodes.find((n) => n.id === args.nodeId);
              if (!node) {
                return {
                  content: {
                    error: `Node with ID "${args.nodeId}" not found`,
                  },
                };
              }
              return {
                content: {
                  node: {
                    id: node.id,
                    type: node.type,
                    position: node.position,
                    data: node.data,
                  },
                },
              };
            } catch (error) {
              return {
                content: {
                  error: error instanceof Error ? error.message : 'Unknown error occurred',
                },
              };
            }
          }
        ),

        // Add ESQL Query Node
        createScreenContextAction(
          {
            name: 'add_esql_query_node',
            description:
              'Add a new ESQL query node to the scratchpad. The node displays the query. Note: To execute ESQL queries, use the built-in "query" function instead. This action only creates the node.',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The ESQL query to display in the node',
                },
                timeRange: {
                  type: 'object',
                  properties: {
                    start: { type: 'string' },
                    end: { type: 'string' },
                  },
                  description: 'Optional time range for the query',
                },
                position: {
                  type: 'object',
                  properties: {
                    x: { type: 'number' },
                    y: { type: 'number' },
                  },
                  description:
                    'Optional position for the node. If not provided, will be auto-positioned.',
                },
              },
              required: ['query'],
            } as const,
          },
          async ({ args }) => {
            try {
              const nodeId = addNode({
                id: `esql-${Date.now()}`,
                type: 'esql_query',
                data: {
                  type: 'esql_query',
                  query: args.query,
                  timeRange: args.timeRange,
                },
                position: args.position || { x: 100, y: 100 },
              });
              return {
                content: `Successfully added ESQL query node "${nodeId}" to the scratchpad.`,
              };
            } catch (error) {
              return {
                content: {
                  error: error instanceof Error ? error.message : 'Unknown error occurred',
                },
              };
            }
          }
        ),

        // Add Text Note Node
        createScreenContextAction(
          {
            name: 'add_text_note_node',
            description:
              'Add a new text note node to the scratchpad for storing notes or documentation.',
            parameters: {
              type: 'object',
              properties: {
                content: {
                  type: 'string',
                  description: 'The text content of the note',
                },
                title: {
                  type: 'string',
                  description: 'Optional title for the note',
                },
                position: {
                  type: 'object',
                  properties: {
                    x: { type: 'number' },
                    y: { type: 'number' },
                  },
                  description: 'Optional position for the node',
                },
              },
              required: ['content'],
            } as const,
          },
          async ({ args }) => {
            try {
              const nodeId = addNode({
                id: `text-${Date.now()}`,
                type: 'text_note',
                data: {
                  type: 'text_note',
                  content: args.content,
                  title: args.title,
                },
                position: args.position || { x: 100, y: 100 },
              });
              return {
                content: `Successfully added text note node "${nodeId}" to the scratchpad.`,
              };
            } catch (error) {
              return {
                content: {
                  error: error instanceof Error ? error.message : 'Unknown error occurred',
                },
              };
            }
          }
        ),

        // Add Kibana Link Node
        createScreenContextAction(
          {
            name: 'add_kibana_link_node',
            description:
              'Add a new link node that references a location in Kibana (e.g., Discover session, Dashboard).',
            parameters: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'The Kibana URL to link to',
                },
                title: {
                  type: 'string',
                  description: 'Display title for the link',
                },
                description: {
                  type: 'string',
                  description: 'Optional description of what the link points to',
                },
                appId: {
                  type: 'string',
                  description: 'The Kibana app ID (e.g., "discover", "dashboard")',
                },
                position: {
                  type: 'object',
                  properties: {
                    x: { type: 'number' },
                    y: { type: 'number' },
                  },
                  description: 'Optional position for the node',
                },
              },
              required: ['url', 'title', 'appId'],
            } as const,
          },
          async ({ args }) => {
            try {
              const nodeId = addNode({
                id: `link-${Date.now()}`,
                type: 'kibana_link',
                data: {
                  type: 'kibana_link',
                  url: args.url,
                  title: args.title,
                  description: args.description,
                  appId: args.appId,
                },
                position: args.position || { x: 100, y: 100 },
              });
              return {
                content: `Successfully added Kibana link node "${nodeId}" to the scratchpad.`,
              };
            } catch (error) {
              return {
                content: {
                  error: error instanceof Error ? error.message : 'Unknown error occurred',
                },
              };
            }
          }
        ),

        // Update Node
        createScreenContextAction(
          {
            name: 'update_node',
            description:
              'Update an existing node in the scratchpad. Can update query, content, or other node properties.',
            parameters: {
              type: 'object',
              properties: {
                nodeId: {
                  type: 'string',
                  description: 'The ID of the node to update',
                },
                updates: {
                  type: 'object',
                  properties: {},
                  description: 'The updates to apply. Structure depends on node type.',
                },
              },
              required: ['nodeId', 'updates'],
            } as const,
          },
          async ({ args }) => {
            try {
              updateNode(args.nodeId, args.updates);
              return {
                content: `Successfully updated node "${args.nodeId}".`,
              };
            } catch (error) {
              return {
                content: {
                  error: error instanceof Error ? error.message : 'Unknown error occurred',
                },
              };
            }
          }
        ),

        // Delete Node
        createScreenContextAction(
          {
            name: 'delete_node',
            description:
              'Delete a node from the scratchpad. This will also remove any edges connected to it.',
            parameters: {
              type: 'object',
              properties: {
                nodeId: {
                  type: 'string',
                  description: 'The ID of the node to delete',
                },
              },
              required: ['nodeId'],
            } as const,
          },
          async ({ args }) => {
            try {
              deleteNode(args.nodeId);
              return {
                content: `Successfully deleted node "${args.nodeId}".`,
              };
            } catch (error) {
              return {
                content: {
                  error: error instanceof Error ? error.message : 'Unknown error occurred',
                },
              };
            }
          }
        ),

        // Create Edge
        createScreenContextAction(
          {
            name: 'create_edge',
            description: 'Create a connection/edge between two nodes in the scratchpad.',
            parameters: {
              type: 'object',
              properties: {
                sourceId: {
                  type: 'string',
                  description: 'The ID of the source node',
                },
                targetId: {
                  type: 'string',
                  description: 'The ID of the target node',
                },
              },
              required: ['sourceId', 'targetId'],
            } as const,
          },
          async ({ args }) => {
            try {
              createEdge(args.sourceId, args.targetId);
              return {
                content: `Successfully created edge from node "${args.sourceId}" to node "${args.targetId}".`,
              };
            } catch (error) {
              return {
                content: {
                  error: error instanceof Error ? error.message : 'Unknown error occurred',
                },
              };
            }
          }
        ),
      ],
    });
  }, [observabilityAIAssistant, nodes, edges, addNode, updateNode, deleteNode, createEdge]);
}
