/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/onechat-common';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { createErrorResult } from '@kbn/onechat-server';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';

const productDocumentationSchema = z.object({
  query: z
    .string()
    .describe(
      'The search query to retrieve documentation. Always write the query in English, as the documentation is available only in English. Examples: "How to enable TLS for Elasticsearch?", "What is Kibana Lens?"'
    ),
  product: z
    .string()
    .optional()
    .describe(
      'Optional product filter to restrict the search to a specific product. Possible options: "kibana", "elasticsearch", "observability", "security". If not specified, will search against all products.'
    ),
  max: z
    .number()
    .optional()
    .default(3)
    .describe('Maximum number of documents to return. Defaults to 3.'),
});

export const productDocumentationTool = (): BuiltinToolDefinition<typeof productDocumentationSchema> => {
  return {
    id: platformCoreTools.productDocumentation,
    type: ToolType.builtin,
    description: `A tool for retrieving documentation about Elastic products.
Use this tool to search and retrieve documentation about the Elastic stack, such as Kibana and Elasticsearch,
or for Elastic solutions, such as Elastic Security, Elastic Observability or Elastic Enterprise Search.

The tool performs semantic search against the Elastic product documentation index, returning relevant
documentation articles that match your query.

Examples of when to use this tool:
- "How to create a space in Kibana?"
- "What is Elasticsearch index lifecycle management?"
- "How to configure alerting rules in Elastic Observability?"
- "What are the security features in Elastic Security?"

Note: The query should always be written in English, as the documentation is available only in English.`,
    schema: productDocumentationSchema,
    handler: async (
      { query, product, max = 3 },
      { modelProvider, llmTasks, logger, request }
    ) => {
      if (!llmTasks) {
        return {
          results: [
            createErrorResult({
              message: 'Product documentation tool is not available. LlmTasks plugin is not available.',
            }),
          ],
        };
      }

      try {
        // Get the default model to extract the connector and inference endpoint
        const model = await modelProvider.getDefaultModel();
        const connector = model.connector;

        // Get inferenceId from connector config if it's an inference connector
        let inferenceId: string | undefined;
        if (connector.type === InferenceConnectorType.Inference) {
          inferenceId = connector.config?.inferenceId;
        }

        // Fallback to default ELSER endpoint if no inferenceId found
        const defaultInferenceEndpoint = inferenceId ?? defaultInferenceEndpoints.ELSER;

        // Check if documentation is available for this inference endpoint
        const productDocsAvailable =
          (await llmTasks.retrieveDocumentationAvailable({
            inferenceId: defaultInferenceEndpoint,
          })) ?? false;

        if (!productDocsAvailable) {
          return {
            results: [
              createErrorResult({
                message: `Product documentation is not available for inference endpoint: ${defaultInferenceEndpoint}. Please ensure the product documentation is installed.`,
              }),
            ],
          };
        }

        // Retrieve documentation
        const result = await llmTasks.retrieveDocumentation({
          searchTerm: query,
          products: product ? [product as any] : undefined,
          max,
          connectorId: connector.connectorId,
          request,
          inferenceId: defaultInferenceEndpoint,
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
          results: result.documents.map((doc) => ({
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
    tags: ['documentation', 'search'],
  };
};

