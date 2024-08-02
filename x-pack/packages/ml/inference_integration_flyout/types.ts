/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { InferenceServiceSettings } from '@elastic/elasticsearch/lib/api/types';

export enum TabType {
  elasticsearch_models = 'elasticsearch_models',
  connect_to_api = 'connect_to_api',
  eland_python_client = 'eland_python_client',
}
export interface Tab {
  id: TabType;
  name: string;
}
export enum ElasticsearchModelDefaultOptions {
  elser = '.elser_model_2',
  e5 = '.multilingual-e5-small',
}
export interface ElasticsearchModelDescriptions {
  title: string;
  description: string;
  documentation: string;
}

export interface CohereServiceSettings {
  api_key: string;
  embedding_type?: string;
  model_id?: string;
}
export interface ElserServiceSettings {
  num_allocations: number;
  num_threads: number;
}
export interface HuggingFaceServiceSettings {
  api_key: string;
  url: string;
}
export interface OpenaiServiceSettings {
  api_key: string;
  model_id?: string;
  organization_id?: string;
  url?: string;
}
// for E5 or a text embedding model uploaded by Eland
export interface ElasticsearchService {
  model_id: string;
  num_allocations: number;
  num_threads: number;
}

export enum Service {
  cohere = 'cohere',
  elser = 'elser',
  huggingFace = 'hugging_face',
  openai = 'openai',
  elasticsearch = 'elasticsearch',
}
export interface ModelConfig {
  service: string;
  service_settings: InferenceServiceSettings;
}
