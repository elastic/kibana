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

export function useStreamRoutingScreenContext(
  definition: Streams.WiredStream.GetResponse,
  childStreamNames: string[],
  createNewRule: (routingDefinition?: Partial<RoutingDefinitionWithUIAttributes>) => void
) {
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

    return setScreenContext({
      screenDescription: `The user is looking at the routing configuration for the stream "${streamName}". This stream currently routes data to ${childStreamNames.length} child stream(s): ${childStreams}.`,
      data: [
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
      ],
      actions: [
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
      ],
    });
  }, [observabilityAIAssistant, definition, childStreamNames, createNewRule]);
}
