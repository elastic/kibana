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

interface ProviderTelemetryField {
  type: 'long';
  _meta: { description: string };
}

// Keep in sync with ServiceProviderKeys
const PROVIDER_SCHEMA: Record<ServiceProviderKeys, ProviderTelemetryField> = {
  'alibabacloud-ai-search': {
    type: 'long',
    _meta: {
      description:
        'The number of inference connectors created using the AlibabaCloud AI Search provider.',
    },
  },
  amazonbedrock: {
    type: 'long',
    _meta: {
      description: 'The number of inference connectors created using the Amazon Bedrock provider.',
    },
  },
  amazon_sagemaker: {
    type: 'long',
    _meta: {
      description:
        'The number of inference connectors created using the Amazon SageMaker provider.',
    },
  },
  anthropic: {
    type: 'long',
    _meta: {
      description: 'The number of inference connectors created using the Anthropic provider.',
    },
  },
  azureaistudio: {
    type: 'long',
    _meta: {
      description: 'The number of inference connectors created using the Azure AI Studio provider.',
    },
  },
  azureopenai: {
    type: 'long',
    _meta: {
      description: 'The number of inference connectors created using the Azure OpenAI provider.',
    },
  },
  cohere: {
    type: 'long',
    _meta: { description: 'The number of inference connectors created using the Cohere provider.' },
  },
  deepseek: {
    type: 'long',
    _meta: {
      description: 'The number of inference connectors created using the DeepSeek provider.',
    },
  },
  elastic: {
    type: 'long',
    _meta: {
      description:
        'The number of inference connectors created using the Elastic Inference Service provider.',
    },
  },
  elasticsearch: {
    type: 'long',
    _meta: {
      description: 'The number of inference connectors created using the Elasticsearch provider.',
    },
  },
  googleaistudio: {
    type: 'long',
    _meta: {
      description:
        'The number of inference connectors created using the Google AI Studio provider.',
    },
  },
  googlevertexai: {
    type: 'long',
    _meta: {
      description:
        'The number of inference connectors created using the Google Vertex AI provider.',
    },
  },
  hugging_face: {
    type: 'long',
    _meta: {
      description: 'The number of inference connectors created using the Hugging Face provider.',
    },
  },
  jinaai: {
    type: 'long',
    _meta: {
      description: 'The number of inference connectors created using the Jina AI provider.',
    },
  },
  mistral: {
    type: 'long',
    _meta: {
      description: 'The number of inference connectors created using the Mistral provider.',
    },
  },
  openai: {
    type: 'long',
    _meta: { description: 'The number of inference connectors created using the OpenAI provider.' },
  },
  voyageai: {
    type: 'long',
    _meta: {
      description: 'The number of inference connectors created using the Voyage AI provider.',
    },
  },
  watsonxai: {
    type: 'long',
    _meta: {
      description: 'The number of inference connectors created using the IBM Watsonx provider.',
    },
  },
  ai21: {
    type: 'long',
    _meta: {
      description: 'The number of inference connectors created using the AI21 labs provider.',
    },
  },
  llama: {
    type: 'long',
    _meta: {
      description: 'The number of inference connectors created using the Llama Stack provider.',
    },
  },
  contextualai: {
    type: 'long',
    _meta: {
      description: 'The number of inference connectors created using the Contextual AI provider.',
    },
  },
  groq: {
    type: 'long',
    _meta: {
      description: 'The number of inference connectors created using the Groq provider.',
    },
  },
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
