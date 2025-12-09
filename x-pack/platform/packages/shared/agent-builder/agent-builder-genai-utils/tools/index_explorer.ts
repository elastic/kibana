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
  const topFields = take(res.fields ?? [], 10)
    .map((f) => `      <field>${f}</field>`)
    .join('\n');

  const description = res.description ?? 'No description provided.';

  return `<resource type="${res.type}" name="${res.name}" description="${description}">
  <sample_fields>
${topFields || '      (No fields available)'}
  </sample_fields>
</resource>`;
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
      `You are an AI assistant for the Elasticsearch company.

Your sole function is to identify the most relevant Elasticsearch resources (indices, aliases, data streams) based on a user's query.

You MUST call the 'select_resources' tool to provide your answer. Do NOT respond with conversational text, explanations, or any data outside of the tool call.

- The user's query will be provided.
- A list of available resources will be provided in XML format.
- You must analyze the query against the resource names, descriptions, and fields.
- Select up to a maximum of ${limit} of the most relevant resources.
- For each selected resource, you MUST provide its 'name', 'type', and a brief 'reason' for your choice.
- If NO resources are relevant, you MUST call the 'select_resources' tool with an empty 'targets' array.

Now, perform your function for the following query and resources.
`,
    ],
    [
      'human',
      `## Query

*The natural language query is:* "${nlQuery}"

## Available resources
<resources>
${resources.map(formatResource).join('\n')}
</resources>

Based on the natural language query and the index descriptions, please return the most relevant indices with your reasoning.
Remember, you should select at maximum ${limit} targets. If none match, just return an empty list.`,
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
        reasoning: z
          .string()
          .optional()
          .describe(
            'optional brief overall reasoning. Can be used to explain why you did not return any target.'
          ),
        targets: z.array(
          z.object({
            reason: z.string().describe('brief explanation of why this resource could be relevant'),
            type: z
              .enum([EsResourceType.index, EsResourceType.alias, EsResourceType.dataStream])
              .describe('the type of the resource'),
            name: z.string().describe('name of the index, alias or data stream'),
          })
        ),
      })
      .describe('Tool to use to select the relevant targets to search against'),
    { name: 'select_resources' }
  );

  const promptContent = createIndexSelectorPrompt({
    resources,
    nlQuery,
    limit,
  });

  const { targets } = await indexSelectorModel.invoke(promptContent);

  return targets;
};
