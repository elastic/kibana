/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { take } from 'lodash';
import { z } from '@kbn/zod';
import type { Logger } from '@kbn/logging';
import { EsResourceType } from '@kbn/agent-builder-common';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { BaseMessageLike } from '@langchain/core/messages';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type {
  AliasSearchSource,
  DataStreamSearchSource,
  IndexSearchSource,
} from './steps/list_search_sources';
import { listSearchSources } from './steps/list_search_sources';
import { flattenMapping, getDataStreamMappings, getIndexMappings } from './utils/mappings';
import { generateXmlTree } from './utils/formatting/xml';

export interface RelevantResource {
  type: EsResourceType;
  name: string;
  reason: string;
}

export interface IndexExplorerResponse {
  resources: RelevantResource[];
}

export interface ResourceDescriptor {
  type: EsResourceType;
  name: string;
  description?: string;
  fields?: string[];
}

const createIndexSummaries = async ({
  indices,
  esClient,
}: {
  indices: IndexSearchSource[];
  esClient: ElasticsearchClient;
}): Promise<ResourceDescriptor[]> => {
  const allMappings = await getIndexMappings({
    indices: indices.map((index) => index.name),
    cleanup: true,
    esClient,
  });

  return indices.map<ResourceDescriptor>(({ name: indexName }) => {
    const indexMappings = allMappings[indexName];
    const flattened = flattenMapping(indexMappings.mappings);
    return {
      type: EsResourceType.index,
      name: indexName,
      description: indexMappings?.mappings._meta?.description,
      fields: flattened.map((field) => field.path),
    };
  });
};

const createAliasSummaries = async ({
  aliases,
}: {
  aliases: AliasSearchSource[];
}): Promise<ResourceDescriptor[]> => {
  // for now aliases are only described by the list of indices they target
  return aliases.map<ResourceDescriptor>(({ name: aliasName, indices }) => {
    return {
      type: EsResourceType.alias,
      name: aliasName,
      description: `Point to the following indices: ${indices.join(', ')}`,
    };
  });
};

const createDatastreamSummaries = async ({
  datastreams,
  esClient,
}: {
  datastreams: DataStreamSearchSource[];
  esClient: ElasticsearchClient;
}): Promise<ResourceDescriptor[]> => {
  const allMappings = await getDataStreamMappings({
    datastreams: datastreams.map((stream) => stream.name),
    cleanup: true,
    esClient,
  });

  return datastreams.map<ResourceDescriptor>(({ name }) => {
    const mappings = allMappings[name];
    const flattened = flattenMapping(mappings.mappings);
    return {
      type: EsResourceType.dataStream,
      name,
      description: mappings?.mappings._meta?.description,
      fields: flattened.map((field) => field.path),
    };
  });
};

export const indexExplorer = async ({
  nlQuery,
  indexPattern = '*',
  includeAliases = true,
  includeDatastream = true,
  limit = 1,
  esClient,
  model,
  logger,
}: {
  nlQuery: string;
  indexPattern?: string;
  includeAliases?: boolean;
  includeDatastream?: boolean;
  limit?: number;
  esClient: ElasticsearchClient;
  model: ScopedModel;
  logger?: Logger;
}): Promise<IndexExplorerResponse> => {
  logger?.trace(() => `index_explorer - query="${nlQuery}", pattern="${indexPattern}"`);

  const sources = await listSearchSources({
    pattern: indexPattern,
    excludeIndicesRepresentedAsDatastream: true,
    excludeIndicesRepresentedAsAlias: false,
    esClient,
    includeKibanaIndices: indexPattern !== '*',
  });

  const indexCount = sources.indices.length;
  const aliasCount = sources.aliases.length;
  const dataStreamCount = sources.data_streams.length;
  const totalCount = indexCount + aliasCount + dataStreamCount;

  logger?.trace(
    () =>
      `index_explorer - found ${indexCount} indices, ${aliasCount} aliases, ${dataStreamCount} datastreams for query="${nlQuery}"`
  );

  if (totalCount <= limit) {
    return {
      resources: [...sources.indices, ...sources.aliases, ...sources.data_streams].map(
        (resource) => {
          return {
            type: resource.type,
            name: resource.name,
            reason: `Index pattern matched less resources that the specified limit of ${limit}.`,
          };
        }
      ),
    };
  }

  const resources: ResourceDescriptor[] = [];
  if (indexCount > 0) {
    const indexDescriptors = await createIndexSummaries({ indices: sources.indices, esClient });
    resources.push(...indexDescriptors);
  }
  if (dataStreamCount > 0 && includeDatastream) {
    const dsDescriptors = await createDatastreamSummaries({
      datastreams: sources.data_streams,
      esClient,
    });
    resources.push(...dsDescriptors);
  }
  if (aliasCount > 0 && includeAliases) {
    const aliasDescriptors = await createAliasSummaries({ aliases: sources.aliases });
    resources.push(...aliasDescriptors);
  }

  const selectedResources = await selectResources({
    resources,
    nlQuery,
    model,
    limit,
  });

  return { resources: selectedResources };
};

export interface SelectedResource {
  type: EsResourceType;
  name: string;
  reason: string;
}

// Helper function to format each resource in an XML-like block
export const formatResource = (res: ResourceDescriptor): string => {
  const topFields = take(res.fields ?? [], 10);

  return generateXmlTree({
    tagName: 'resource',
    attributes: {
      type: res.type,
      name: res.name,
      description: res.description ?? 'No description provided.',
    },
    children: [
      {
        tagName: 'sample_fields',
        children:
          topFields.length > 0
            ? topFields.map((field) => ({ tagName: 'field', children: [field] }))
            : ['(No fields available)'],
      },
    ],
  });
};

export const createIndexSelectorPrompt = ({
  resources,
  nlQuery,
  limit = 1,
}: {
  resources: ResourceDescriptor[];
  nlQuery: string;
  limit?: number;
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `You are an AI assistant for Elasticsearch. Your task is to select the most relevant Elasticsearch resources based on a user query.

## CRITICAL INSTRUCTIONS

You MUST call the 'select_resources' tool. Do NOT respond with text or explanations.

## Tool Schema

The 'select_resources' tool expects this exact structure:
{
  "targets": [
    {
      "name": "resource_name",
      "type": "index" | "alias" | "data_stream",
      "reason": "why this resource is relevant"
    }
  ]
}

## Rules

1. ALWAYS call the 'select_resources' tool - never respond with plain text
2. The 'targets' property MUST be an array at the root level
3. Select at most ${limit} resource(s)
4. If no resources match, call the tool with: {"targets": []}
5. Each target must have: "name", "type", and "reason" fields
`,
    ],
    [
      'human',
      `## Query

"${nlQuery}"

## Available Resources

${resources.map(formatResource).join('\n')}

Call the 'select_resources' tool now with your selection. Maximum ${limit} target(s). Use an empty targets array if none match.`,
    ],
  ];
};

const selectResources = async ({
  resources,
  nlQuery,
  model,
  limit = 1,
}: {
  resources: ResourceDescriptor[];
  nlQuery: string;
  model: ScopedModel;
  limit?: number;
}): Promise<SelectedResource[]> => {
  const { chatModel } = model;
  const indexSelectorModel = chatModel.withStructuredOutput(
    z
      .object({
        targets: z
          .array(
            z.object({
              reason: z
                .string()
                .describe('brief explanation of why this resource could be relevant'),
              type: z
                .enum([EsResourceType.index, EsResourceType.alias, EsResourceType.dataStream])
                .describe('the type of the resource'),
              name: z.string().describe('name of the resource'),
            })
          )
          .default([])
          .describe(
            'The list of selected resources (indices, aliases and/or datastreams). Must be an array. Use an empty array if no resources match.'
          ),
      })
      .describe('Tool to select the relevant Elasticsearch resources to search against'),
    { name: 'select_resources' }
  );

  const promptContent = createIndexSelectorPrompt({
    resources,
    nlQuery,
    limit,
  });

  const response = await indexSelectorModel.invoke(promptContent);
  // Handle case where response might be malformed or targets is not an array
  return Array.isArray(response?.targets) ? response.targets : [];
};
