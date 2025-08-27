/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { ScopedModel } from '@kbn/onechat-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type {
  AliasSearchSource,
  IndexSearchSource,
  DataStreamSearchSource,
  EsSearchSource,
} from './steps/list_search_sources';
import { listSearchSources } from './steps/list_search_sources';
import { getIndexMappings, getDatastreamMappings } from './steps/get_mappings';
import { flattenMappings } from './utils/mappings';

export interface RelevantResource {
  type: 'index' | 'alias' | 'data_stream';
  name: string;
  reason: string;
}

export interface IndexExplorerResponse {
  resources: RelevantResource[];
}

interface ResourceDescriptor {
  type: 'index' | 'alias' | 'data_stream';
  name: string;
  description?: string;
  fields: string[];
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
    const flattened = flattenMappings({ mappings: indexMappings.mappings });
    return {
      type: 'index',
      name: indexName,
      description: indexMappings?.mappings._meta?.description,
      fields: flattened.map((field) => field.path),
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
  const allMappings = await getDatastreamMappings({
    datastreams: datastreams.map((stream) => stream.name),
    cleanup: true,
    esClient,
  });

  return datastreams.map<ResourceDescriptor>(({ name }) => {
    const mappings = allMappings[name];
    const flattened = flattenMappings({ mappings: mappings.mappings });
    return {
      type: 'data_stream',
      name,
      description: mappings?.mappings._meta?.description,
      fields: flattened.map((field) => field.path),
    };
  });
};

export const indexExplorer = async ({
  nlQuery,
  indexPattern = '*',
  limit = 1,
  esClient,
  model,
}: {
  nlQuery: string;
  indexPattern?: string;
  limit?: number;
  esClient: ElasticsearchClient;
  model: ScopedModel;
}): Promise<IndexExplorerResponse> => {
  console.log('indexExplorer - start', indexPattern, nlQuery);

  const sources = await listSearchSources({
    pattern: indexPattern,
    esClient,
  });

  const hasIndices = sources.indices.length > 0;
  const hasAliases = sources.aliases.length > 0;
  const hasDataStreams = sources.data_streams.length > 0;

  console.log(
    'indexExplorer - list resources',
    sources.indices.length,
    sources.aliases.length,
    sources.data_streams.length
  );

  if (!hasAliases && !hasIndices && !hasDataStreams) {
    return { resources: [] };
  }

  // TODO: if only one, return it.

  const resources: ResourceDescriptor[] = [];
  if (hasIndices) {
    const indexDescriptors = await createIndexSummaries({ indices: sources.indices, esClient });
    resources.push(...indexDescriptors);
  }
  if (hasDataStreams) {
    const dsDescriptors = await createDatastreamSummaries({
      datastreams: sources.data_streams,
      esClient,
    });
    resources.push(...dsDescriptors);
  }
  // TODO: aliases

  // console.log('*** resource descriptors');
  // console.log(JSON.stringify(resources, null, 2));

  // TODO: FIX

  const selectedIndices = await selectIndices({
    resources,
    nlQuery,
    model,
    limit,
  });

  console.log('**** selected indices', selectedIndices);

  const relevantResources: RelevantResource[] = selectedIndices.map<RelevantResource>(
    ({ name, type, reason }) => {
      return {
        name,
        type,
        reason,
      };
    }
  );

  return { resources: relevantResources };
};

export interface SelectedResource {
  type: 'index' | 'alias' | 'data_stream';
  name: string;
  reason: string;
}

export const createIndexSelectorPrompt = ({
  resources,
  nlQuery,
  limit = 1,
}: {
  resources: ResourceDescriptor[];
  nlQuery: string;
  limit?: number;
}): string => {
  // TODO: better formatting

  const indicesAndDescriptions = resources
    .map((resource) => {
      if (resource.type === 'index') {
        // TODO
        return `- Index: ${resource.name} - description: ${resource.description}`;
      }
      if (resource.type === 'alias') {
        // TODO
      }
      if (resource.type === 'data_stream') {
        // TODO
        return `- DataStream: ${resource.name} - description: ${resource.description}`;
      }
      return '';
    })
    .join('\n\n');

  return `You are an AI assistant for the Elasticsearch company.
       based on a natural language query from the user, your task is to select up to ${limit} most relevant targets
       to perform that search, from a list of indices, aliases and datastreams.

       *The natural language query is:* ${nlQuery}

       *List of indices with their descriptions:*
       ${indicesAndDescriptions}

       Based on the natural language query and the index descriptions, please return the most relevant indices with your reasoning.
       Remember, you should select at maximum ${limit} targets.
       `;
};

const selectIndices = async ({
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
    z.object({
      targets: z.array(
        z.object({
          reason: z.string().describe('brief explanation of why this resource could be relevant'),
          type: z.enum(['index', 'alias', 'data_stream']).describe('the type of the resource'),
          name: z.string().describe('name of the index, alias or data stream'),
        })
      ),
    })
  );

  const promptContent = createIndexSelectorPrompt({
    resources,
    nlQuery,
    limit,
  });

  const { targets } = await indexSelectorModel.invoke(promptContent);

  return targets;
};
