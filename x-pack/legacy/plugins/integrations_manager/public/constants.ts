/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IconType } from '@elastic/eui';
import { KibanaAssetType, AssetType, ServiceName } from '../common/types';

export const DisplayedAssets: Record<ServiceName, AssetType[]> = {
  kibana: ['index-pattern', 'visualization', 'search', 'dashboard'],
  elasticsearch: ['index-template', 'ingest-pipeline', 'ilm-policy'],
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
