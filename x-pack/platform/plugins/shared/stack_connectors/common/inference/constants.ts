/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INFERENCE_CONNECTOR_TITLE = i18n.translate(
  'xpack.stackConnectors.components.inference.connectorTypeTitle',
  {
    defaultMessage: 'AI Connector',
  }
);

// TODO: this is duplicated in the package - is this one still used? It was also out of date
// Might need to combine package and plugin to avoid duplication
export enum ServiceProviderKeys {
  'alibabacloud-ai-search' = 'alibabacloud-ai-search',
  amazonbedrock = 'amazonbedrock',
  'amazon_sagemaker' = 'amazon_sagemaker',
  anthropic = 'anthropic',
  azureaistudio = 'azureaistudio',
  azureopenai = 'azureopenai',
  cohere = 'cohere',
  deepseek = 'deepseek',
  elastic = 'elastic',
  elasticsearch = 'elasticsearch',
  googleaistudio = 'googleaistudio',
  googlevertexai = 'googlevertexai',
  hugging_face = 'hugging_face',
  jinaai = 'jinaai',
  mistral = 'mistral',
  openai = 'openai',
  voyageai = 'voyageai',
  watsonxai = 'watsonxai',
}

export const INFERENCE_CONNECTOR_ID = '.inference';
export enum SUB_ACTION {
  UNIFIED_COMPLETION_ASYNC_ITERATOR = 'unified_completion_async_iterator',
  UNIFIED_COMPLETION_STREAM = 'unified_completion_stream',
  UNIFIED_COMPLETION = 'unified_completion',
  COMPLETION = 'completion',
  RERANK = 'rerank',
  TEXT_EMBEDDING = 'text_embedding',
  SPARSE_EMBEDDING = 'sparse_embedding',
  COMPLETION_STREAM = 'completion_stream',
}

export const DEFAULT_PROVIDER = 'openai';
export const DEFAULT_TASK_TYPE = 'completion';
