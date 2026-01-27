/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common';
import type { CoreSetup } from '@kbn/core/server';
import type { AgentBuilderPlatformPluginStart, PluginStartDependencies } from '../types';

const INTEGRATION_KNOWLEDGE_INDEX = '.integration_knowledge';
const INTEGRATIONS_BASE_PATH = '/app/integrations/detail';

// Maximum number of highlighted fragments (chunks) to return per document
const MAX_FRAGMENTS_PER_DOC = 5;
// Fallback: maximum content length when highlights unavailable
const MAX_CONTENT_LENGTH = 4000;

const integrationKnowledgeSchema = z.object({
  query: z
    .string()
    .describe(
      'Search query to retrieve knowledge about Fleet-installed integrations, like specific integration names, configuration questions, or data ingestion topics. Rewrite the query to English and incorporate relevant context from the conversation history.'
    ),
  max: z
    .number()
    .optional()
    .default(5)
    .describe('Maximum number of documents to return. Defaults to 5.'),
});

interface IntegrationKnowledgeDoc {
  package_name: string;
  filename: string;
  content: string;
  version?: string;
}

/**
 * Extracts relevant text from highlighted fragments returned by semantic search.
 * Falls back to truncated full content if highlights are not available.
 */
function extractRelevantContent(
  highlights: string[] | undefined,
  fullContent: string
): { content: string; isPartial: boolean } {
  // Use highlighted fragments if available - these are the matching chunks
  if (highlights && highlights.length > 0) {
    // Join highlighted fragments - they represent the most relevant chunks
    const highlightedContent = highlights.join('\n\n---\n\n');
    return {
      content: highlightedContent,
      isPartial: true, // Always partial since we're only returning matching chunks
    };
  }

  // Fallback: truncate full content if highlights unavailable
  if (fullContent.length > MAX_CONTENT_LENGTH) {
    return {
      content: fullContent.substring(0, MAX_CONTENT_LENGTH) + '\n\n[Content truncated...]',
      isPartial: true,
    };
  }

  return { content: fullContent, isPartial: false };
}

export const integrationKnowledgeTool = (
  coreSetup: CoreSetup<PluginStartDependencies, AgentBuilderPlatformPluginStart>
): BuiltinToolDefinition<typeof integrationKnowledgeSchema> => {
  const baseTool: BuiltinToolDefinition<typeof integrationKnowledgeSchema> = {
    id: platformCoreTools.integrationKnowledge,
    type: ToolType.builtin,
    description: `Search and retrieve knowledge from Fleet-installed integrations. This includes information on how to configure and use integrations for data ingestion into Elasticsearch.`,
    schema: integrationKnowledgeSchema,
    handler: async ({ query, max = 5 }, { esClient, logger }) => {
      try {
        // Search the .integration_knowledge index using semantic search on the content field
        // Use highlighting to retrieve only the relevant chunks instead of full document content
        const response = await esClient.asInternalUser.search({
          index: INTEGRATION_KNOWLEDGE_INDEX,
          size: max,
          query: {
            semantic: {
              field: 'content',
              query,
            },
          },
          highlight: {
            fields: {
              content: {
                order: 'score',
                number_of_fragments: MAX_FRAGMENTS_PER_DOC,
              },
            },
          },
          _source: ['package_name', 'filename', 'content', 'version'],
        });

        if (response.hits.hits.length === 0) {
          return {
            results: [
              createErrorResult({
                message: 'No integration knowledge found for the given query.',
                metadata: {
                  query,
                },
              }),
            ],
          };
        }

        // Return integration knowledge results with extracted relevant chunks from highlights
        return {
          results: response.hits.hits.map((hit) => {
            const source = hit._source as IntegrationKnowledgeDoc;
            const packageUrl = `${INTEGRATIONS_BASE_PATH}/${source.package_name}`;
            const title = `${source.package_name} integration${
              source.version ? ` (v${source.version})` : ''
            } - ${source.filename}`;

            // Extract only relevant chunks from highlights, or fall back to truncated content
            const highlights = hit.highlight?.content;
            const { content: extractedContent, isPartial } = extractRelevantContent(
              highlights,
              source.content
            );

            return {
              type: ToolResultType.other,
              data: {
                reference: {
                  url: packageUrl,
                  title,
                },
                partial: isPartial,
                content: {
                  package_name: source.package_name,
                  filename: source.filename,
                  version: source.version,
                  content: extractedContent,
                },
              },
            };
          }),
        };
      } catch (error) {
        logger.error(`Error retrieving integration knowledge: ${error.message}`);
        return {
          results: [
            createErrorResult({
              message: `Failed to retrieve integration knowledge: ${error.message}. The integration knowledge base may not be available.`,
            }),
          ],
        };
      }
    },
    tags: ['integration', 'knowledge-base', 'fleet'],
    availability: {
      cacheMode: 'global',
      handler: async () => {
        try {
          const [coreStart] = await coreSetup.getStartServices();
          const esClient = coreStart.elasticsearch.client.asInternalUser;

          // Check if the .integration_knowledge index exists
          // This has to be done with `.search` since `.exists` and `.get` can't be performed
          // with the internal system user (lack of permissions)
          await esClient.search({
            index: INTEGRATION_KNOWLEDGE_INDEX,
            size: 0,
          });

          return { status: 'available' };
        } catch (error) {
          // If there's an error checking the index, assume it doesn't exist
          return { status: 'unavailable' };
        }
      },
    },
  };

  return baseTool;
};
