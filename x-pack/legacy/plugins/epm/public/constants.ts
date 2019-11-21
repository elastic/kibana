/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IconType } from '@elastic/eui';
import { ElasticsearchAssetType, KibanaAssetType, AssetType, ServiceName } from '../common/types';

// TODO: figure out how to allow only corresponding asset types (KibanaAssetType, ElasticsearchAssetType)
export const DisplayedAssets: Record<ServiceName, AssetType[]> = {
  kibana: Object.values(KibanaAssetType),
  elasticsearch: Object.values(ElasticsearchAssetType),
};

export const AssetTitleMap: Record<AssetType, string> = {
  dashboard: 'Dashboard',
  'ilm-policy': 'ILM Policy',
  'ingest-pipeline': 'Ingest Pipeline',
  'index-pattern': 'Index Pattern',
  'index-template': 'Index Template',
  search: 'Saved Search',
  visualization: 'Visualization',
};

export const ServiceTitleMap: Record<ServiceName, string> = {
  elasticsearch: 'Elasticsearch',
  kibana: 'Kibana',
};

export const AssetIcons: Record<KibanaAssetType, IconType> = {
  dashboard: 'dashboardApp',
  'index-pattern': 'indexPatternApp',
  search: 'searchProfilerApp',
  visualization: 'visualizeApp',
};

export const ServiceIcons: Record<ServiceName, IconType> = {
  elasticsearch: 'logoElasticsearch',
  kibana: 'logoKibana',
};
