/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/onechat-common';
import { defaultInferenceEndpoints, InferenceConnectorType } from '@kbn/inference-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { createErrorResult } from '@kbn/onechat-server';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { CoreSetup } from '@kbn/core/server';
import type { RetrieveDocumentationResultDoc } from '@kbn/llm-tasks-plugin/server';
import type { OnechatStartDependencies, OnechatPluginStart } from '../../../../types';
import { createModelProvider } from '../../../runner/model_provider';

const productDocumentationSchema = z.object({
  query: z.string().describe('Search query to retrieve documentation about Elastic products'),
  product: z
    .enum(['kibana', 'elasticsearch', 'observability', 'security'])
    .optional()
    .describe('Product to filter by: "kibana", "elasticsearch", "observability", or "security"'),
  max: z
    .number()
    .optional()
    .default(3)
    .describe('Maximum number of documents to return. Defaults to 3.'),
});

export const productDocumentationTool = (
  coreSetup: CoreSetup<OnechatStartDependencies, OnechatPluginStart>
): BuiltinToolDefinition<typeof productDocumentationSchema> => {
  // Create a closure that will resolve llmTasks when the handler is called
  const getLlmTasks = async () => {
    const [, plugins] = await coreSetup.getStartServices();
    return plugins.llmTasks;
  };

  const baseTool: BuiltinToolDefinition<typeof productDocumentationSchema> = {
    id: platformCoreTools.productDocumentation,
    type: ToolType.builtin,
    description: `Search and retrieve documentation about Elastic products (Kibana, Elasticsearch, Elastic Security, Elastic Observability).`,
    schema: productDocumentationSchema,
    handler: async ({ query, product, max = 3 }, { modelProvider, logger, request }) => {
      const llmTasks = await getLlmTasks();
      if (!llmTasks) {
        return {
          results: [
            createErrorResult({
              message:
                'Product documentation tool is not available. LlmTasks plugin is not available.',
            }),
          ],
        };
      }

      try {
        // Get the default model to extract the connector
        const model = await modelProvider.getDefaultModel();
        const connector = model.connector;

        // TODO make this configurable, we need a platform level setting for the embedding model
        const inferenceId = defaultInferenceEndpoints.ELSER;

        // Retrieve documentation
        const result = await llmTasks.retrieveDocumentation({
          searchTerm: query,
          products: product ? [product as any] : undefined,
          max,
          connectorId: connector.connectorId,
          request,
          inferenceId,
        });

        if (!result.success || result.documents.length === 0) {
          return {
            results: [
              createErrorResult({
                message: 'No documentation found for the given query.',
                metadata: {
                  query,
                  product: product || 'all',
                },
              }),
            ],
          };
        }

        // Return documentation results
        return {
          results: result.documents.map((doc: RetrieveDocumentationResultDoc) => ({
            type: ToolResultType.resource,
            data: {
              reference: {
                url: doc.url,
                title: doc.title,
              },
              partial: doc.summarized,
              content: {
                title: doc.title,
                url: doc.url,
                content: doc.content,
                summarized: doc.summarized,
              },
            },
          })),
        };
      } catch (error) {
        logger.error(`Error retrieving product documentation: ${error.message}`);
        return {
          results: [
            createErrorResult({
              message: `Failed to retrieve product documentation: ${error.message}`,
            }),
          ],
        };
      }
    },
    tags: [],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        try {
          const [, plugins] = await coreSetup.getStartServices();
          const llmTasks = plugins.llmTasks;

          if (!llmTasks) {
            return { status: 'unavailable' };
          }

          // Try to get inferenceId from the default connector using modelProvider
          let inferenceId = defaultInferenceEndpoints.ELSER;
          try {
            const modelProvider = createModelProvider({
              inference: plugins.inference,
              request,
            });
            const model = await modelProvider.getDefaultModel();
            const connector = model.connector;
            // For inference connectors, inferenceId is stored in config.inferenceId
            if (
              connector.type === InferenceConnectorType.Inference &&
              connector.config?.inferenceId
            ) {
              inferenceId = connector.config.inferenceId;
            }
          } catch {
            // If we can't get the connector, fall back to default ELSER endpoint
          }

          const isAvailable =
            (await llmTasks.retrieveDocumentationAvailable({
              inferenceId,
            })) ?? false;

          return {
            status: isAvailable ? 'available' : 'unavailable',
          };
        } catch (error) {
          return { status: 'unavailable' };
        }
      },
    },
  };

  return baseTool;
};
