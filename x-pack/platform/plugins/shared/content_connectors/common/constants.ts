/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { IngestPipelineParams } from '@kbn/search-connectors';
import dedent from 'dedent';

export const PLUGIN_ID = 'content_connectors';
export const DEFAULT_PIPELINE_NAME = 'search-default-ingestion';
export const DEFAULT_PIPELINE_VALUES: IngestPipelineParams = {
  extract_binary_content: true,
  name: DEFAULT_PIPELINE_NAME,
  reduce_whitespace: true,
  run_ml_inference: true,
};

export enum SearchIndexTabId {
  // all indices
  OVERVIEW = 'overview',
  DOCUMENTS = 'documents',
  INDEX_MAPPINGS = 'index_mappings',
  PIPELINES = 'pipelines',
  // connector indices
  CONFIGURATION = 'configuration',
  SYNC_RULES = 'sync_rules',
  SCHEDULING = 'scheduling',
}

export enum INGESTION_METHOD_IDS {
  API = 'api',
  CONNECTOR = 'connector',
}

export const ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE = 'elastic-crawler';
export interface DefaultConnectorsPipelineMeta {
  default_extract_binary_content: boolean;
  default_name: string;
  default_reduce_whitespace: boolean;
  default_run_ml_inference: boolean;
}

export const CREATE_CONNECTOR_PLUGIN = {
  CLI_SNIPPET: dedent`./bin/connectors connector create
  --index-name my-index
  --index-language en
  --from-file config.yml
  `,
};

export const ELASTICSEARCH_PLUGIN = {
  ID: PLUGIN_ID,
  NAME: i18n.translate('xpack.contentConnectors.common.productName', {
    defaultMessage: 'Content connectors',
  }),
  DESCRIPTION: i18n.translate('xpack.contentConnectors.common.productDescription', {
    defaultMessage: 'Low-level tools for creating performant and relevant search experiences.',
  }),
  URL: '/app/management/data/search_connectors/connectors',
  SUPPORT_URL: 'https://discuss.elastic.co/c/elastic-stack/elasticsearch/',
};

export const MANAGE_API_KEYS_URL = '/app/management/security/api_keys';
export const INPUT_THROTTLE_DELAY_MS = 1000;
export const ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT = 25;
