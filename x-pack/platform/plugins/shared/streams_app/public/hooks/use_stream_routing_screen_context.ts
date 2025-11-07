/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { Streams } from '@kbn/streams-schema';
import type { Condition } from '@kbn/streamlang';
import type { RoutingDefinitionWithUIAttributes } from '../components/data_management/stream_detail_routing/types';
import { useKibana } from './use_kibana';

interface UseStreamRoutingScreenContextOptions {
  definition: Streams.WiredStream.GetResponse;
  childStreamNames: string[];
  createNewRule: (routingDefinition?: Partial<RoutingDefinitionWithUIAttributes>) => void;
  suggestions?: Array<{ name: string; condition: Condition }> | null;
  previewColumns?: string[];
  previewDocuments?: Array<Record<string, unknown>>;
  setSuggestions?: (suggestions: Array<{ name: string; condition: Condition }>) => void;
}

export function useStreamRoutingScreenContext({
  definition,
  childStreamNames,
  createNewRule,
  suggestions,
  previewColumns,
  previewDocuments,
  setSuggestions,
}: UseStreamRoutingScreenContextOptions) {
  const {
    dependencies: {
      start: { observabilityAIAssistant },
    },
  } = useKibana();

  useEffect(() => {
    if (!observabilityAIAssistant) {
      return;
    }

    const streamName = definition.stream.name;
    const childStreams = childStreamNames.join(', ') || 'none';

    const {
      service: { setScreenContext },
      createScreenContextAction,
    } = observabilityAIAssistant;

    // Prepare data for screen context
    const contextData: Array<{
      name: string;
      description: string;
      value: Record<string, unknown>;
    }> = [
      {
        name: 'stream_info',
        description: 'Information about the current stream and its routing configuration',
        value: {
          streamName,
          childStreams: childStreamNames,
          childStreamCount: childStreamNames.length,
          routingRules: definition.stream.ingest.wired.routing.map((rule) => ({
            destination: rule.destination,
            condition: JSON.stringify(rule.where),
            status: rule.status,
          })),
        },
      },
    ];

    // Add suggestions if available
    if (suggestions && suggestions.length > 0) {
      contextData.push({
        name: 'current_suggestions',
        description:
          'AI-generated suggestions for routing rules that are currently being reviewed by the user',
        value: {
          suggestions: suggestions.map((s) => ({
            name: s.name,
            condition: JSON.stringify(s.condition),
          })),
        },
      });
    }

    // Add preview data if available
    if (previewColumns && previewColumns.length > 0 && previewDocuments) {
      contextData.push({
        name: 'preview_data',
        description:
          'Sample data from the stream preview showing the first 5 documents and available columns',
        value: {
          columns: previewColumns,
          sampleDocuments: previewDocuments.slice(0, 5).map((doc) => JSON.stringify(doc)),
        },
      });
    }

    return setScreenContext({
      screenDescription: `The user is looking at the routing configuration for the stream "${streamName}". This stream currently routes data to ${
        childStreamNames.length
      } child stream(s): ${childStreams}.${
        suggestions && suggestions.length > 0
          ? ` The AI has generated ${suggestions.length} partition suggestions that are currently being reviewed.`
          : ''
      }`,
      data: contextData,
      actions: [
        ...(suggestions && suggestions.length > 0
          ? [
              createScreenContextAction(
                {
                  name: 'create_routing_rule',
                  description:
                    'Create a new routing rule for the stream. This allows routing documents to child streams based on conditions. Creating a routing rule automatically creates the child stream if it doesn\'t exist yet. CRITICAL: You must use exact field names from the streamlang schema: "eq" (not "equals"), "neq", "lt", "lte", "gt", "gte", "contains", "startsWith", "endsWith", "exists", "and", "or", "not", "always", "never".',
                  parameters: {
                    type: 'object',
                    properties: {
                      destination: {
                        type: 'string',
                        description: `The destination child stream name. Must start with "${streamName}." (e.g., "${streamName}.logs", "${streamName}.errors"). Available child streams: ${childStreams}`,
                      },
                      condition: {
                        type: 'object',
                        properties: {},
                        description: `A condition object that determines when documents should be routed to this destination. MUST use exact field names from streamlang schema:

COMPARISON CONDITIONS (use "field" + operator):
- Equality: {"field": "log.level", "eq": "error"} (use "eq" not "equals")
- Not equal: {"field": "status", "neq": "success"}
- Less than: {"field": "response_time", "lt": 1000}
- Less/equal: {"field": "count", "lte": 100}
- Greater than: {"field": "severity", "gt": 5}
- Greater/equal: {"field": "priority", "gte": 3}
- Contains: {"field": "message", "contains": "error"}
- Starts with: {"field": "url", "startsWith": "/api"}
- Ends with: {"field": "filename", "endsWith": ".log"}

EXISTENCE CONDITIONS:
- Field exists: {"field": "error.message", "exists": true}
- Field not exists: {"field": "optional", "exists": false}

LOGICAL OPERATORS:
- AND: {"and": [{"field": "level", "eq": "error"}, {"field": "namespace", "eq": "api"}]}
- OR: {"or": [{"field": "status", "eq": "error"}, {"field": "status", "eq": "warning"}]}
- NOT: {"not": {"field": "environment", "eq": "production"}}

SPECIAL CONDITIONS:
- Always match: {"always": {}}
- Never match: {"never": {}}

IMPORTANT: Use "eq" not "equals", "neq" not "not_equals", etc. The exact field names matter.`,
                      },
                    },
                    required: ['destination', 'condition'],
                  } as const,
                },
                async ({ args }) => {
                  try {
                    const { destination, condition } = args;

                    // Validate destination starts with stream name
                    if (!destination.startsWith(`${streamName}.`)) {
                      return {
                        content: {
                          error: `Destination must start with "${streamName}." (e.g., "${streamName}.logs")`,
                        },
                      };
                    }

                    // Call the state machine to create the routing rule
                    createNewRule({
                      destination,
                      where: condition as unknown as Condition,
                    });

                    return {
                      content: `Successfully created routing rule to destination "${destination}". The rule is now in the UI for the user to review and save.`,
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
            ]
          : []),
        // Add action for updating suggestions if the callback is provided
        ...(setSuggestions
          ? [
              createScreenContextAction(
                {
                  name: 'update_routing_suggestions',
                  description:
                    'Update the list of routing rule suggestions. This replaces all current suggestions with the provided list and automatically previews them. Use this to refine or modify existing AI-generated suggestions.',
                  parameters: {
                    type: 'object',
                    properties: {
                      suggestions: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: {
                              type: 'string',
                              description:
                                'The name/destination of the partition (e.g., "logs", "errors")',
                            },
                            condition: {
                              type: 'object',
                              properties: {},
                              description:
                                'The routing condition using streamlang schema (same format as create_routing_rule)',
                            },
                          },
                          required: ['name', 'condition'],
                        },
                        description: 'Array of updated routing rule suggestions',
                      },
                    },
                    required: ['suggestions'],
                  } as const,
                },
                async ({ args }) => {
                  try {
                    const { suggestions: newSuggestions } = args;

                    if (!newSuggestions || newSuggestions.length === 0) {
                      return {
                        content: {
                          error: 'Suggestions array cannot be empty',
                        },
                      };
                    }

                    // Convert suggestions to the expected format
                    const formattedSuggestions = newSuggestions.map(
                      (s: { name: string; condition: Record<string, unknown> }) => ({
                        name: s.name,
                        condition: s.condition as unknown as Condition,
                      })
                    );

                    // Call the callback to update suggestions
                    setSuggestions(formattedSuggestions);

                    return {
                      content: `Successfully updated ${formattedSuggestions.length} routing suggestions. They are now being previewed in the UI.`,
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
            ]
          : []),
      ],
    });
  }, [
    observabilityAIAssistant,
    definition,
    childStreamNames,
    createNewRule,
    suggestions,
    previewColumns,
    previewDocuments,
    setSuggestions,
  ]);
}
