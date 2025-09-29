/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';

interface InferenceConnectorsUsage {
  inference_count_by_provider: Record<string, number>;
}

interface ByProviderBucket {
  key: string;
  doc_count: number;
}

interface SearchAggs {
  byProvider?: { buckets?: ByProviderBucket[] };
}

// Keep in sync with ServiceProviderKeys
const PROVIDER_SCHEMA: Record<ServiceProviderKeys, { type: 'long' }> = {
  'alibabacloud-ai-search': { type: 'long' },
  amazonbedrock: { type: 'long' },
  amazon_sagemaker: { type: 'long' },
  anthropic: { type: 'long' },
  azureaistudio: { type: 'long' },
  azureopenai: { type: 'long' },
  cohere: { type: 'long' },
  deepseek: { type: 'long' },
  elastic: { type: 'long' },
  elasticsearch: { type: 'long' },
  googleaistudio: { type: 'long' },
  googlevertexai: { type: 'long' },
  hugging_face: { type: 'long' },
  jinaai: { type: 'long' },
  mistral: { type: 'long' },
  openai: { type: 'long' },
  voyageai: { type: 'long' },
  watsonxai: { type: 'long' },
  ai21: { type: 'long' },
  llama: { type: 'long' },
};

export function registerInferenceConnectorsUsageCollector(
  usageCollection: UsageCollectionSetup,
  core: CoreSetup
) {
  const collector = usageCollection.makeUsageCollector<InferenceConnectorsUsage>({
    type: 'stack_connectors',
    isReady: () => true,
    schema: {
      inference_count_by_provider: {
        ...PROVIDER_SCHEMA,
      },
    },
    fetch: async () => {
      const [coreStart] = await core.getStartServices();
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const actionIndex = coreStart.savedObjects.getIndexForType('action');

      try {
        const result = await esClient.search<unknown, SearchAggs>({
          index: actionIndex,
          size: 0,
          runtime_mappings: {
            provider: {
              type: 'keyword',
              script: {
                source:
                  'emit(params._source["action"]["config"]["provider"] != null ? params._source["action"]["config"]["provider"] : "unknown")',
              },
            },
          },
          query: {
            bool: {
              filter: [
                { term: { type: 'action' } },
                { term: { 'action.actionTypeId': '.inference' } },
              ],
            },
          },
          aggs: {
            byProvider: {
              terms: {
                field: 'provider',
                size: 100,
              },
            },
          },
        });

        const buckets = result.aggregations?.byProvider?.buckets ?? [];
        const countByProvider: Record<string, number> = {};
        for (const bucket of buckets) {
          countByProvider[bucket.key] = bucket.doc_count;
        }

        return {
          inference_count_by_provider: countByProvider,
        };
      } catch (e) {
        return {
          inference_count_by_provider: {},
        };
      }
    },
  });

  usageCollection.registerCollector(collector);
}
