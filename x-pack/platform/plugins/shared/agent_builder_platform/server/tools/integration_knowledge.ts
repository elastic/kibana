/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { createErrorResult } from '@kbn/onechat-server';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { CoreSetup } from '@kbn/core/server';
import type { AgentBuilderPlatformPluginStart, PluginStartDependencies } from '../types';

const INTEGRATION_KNOWLEDGE_INDEX = '.integration_knowledge';
const INTEGRATIONS_BASE_PATH = '/app/integrations/detail';

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
        const response = await esClient.asInternalUser.search({
          index: INTEGRATION_KNOWLEDGE_INDEX,
          size: max,
          query: {
            semantic: {
              field: 'content',
              query,
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

        // Return integration knowledge results
        return {
          results: response.hits.hits.map((hit) => {
            const source = hit._source as IntegrationKnowledgeDoc;
            const packageUrl = `${INTEGRATIONS_BASE_PATH}/${source.package_name}`;
            const title = `${source.package_name} integration${
              source.version ? ` (v${source.version})` : ''
            } - ${source.filename}`;

            return {
              type: ToolResultType.resource,
              data: {
                reference: {
                  url: packageUrl,
                  title,
                },
                partial: false,
                content: {
                  package_name: source.package_name,
                  filename: source.filename,
                  version: source.version,
                  content: source.content,
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
