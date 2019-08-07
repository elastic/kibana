/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IconType } from '@elastic/eui';
import {
  ASSET_TYPE_CONFIG,
  ASSET_TYPE_DASHBOARD,
  ASSET_TYPE_INDEX_PATTERN,
  ASSET_TYPE_INGEST_PIPELINE,
  ASSET_TYPE_SEARCH,
  ASSET_TYPE_TIMELION_SHEET,
  ASSET_TYPE_VISUALIZATION,
} from '../common/constants';
import { AssetType, ServiceName } from '../common/types';

export const AssetTitleMap: Record<AssetType, string> = {
  [ASSET_TYPE_CONFIG]: 'Config',
  [ASSET_TYPE_DASHBOARD]: 'Dashboard',
  [ASSET_TYPE_INDEX_PATTERN]: 'Index Pattern',
  [ASSET_TYPE_SEARCH]: 'Saved Search',
  [ASSET_TYPE_TIMELION_SHEET]: 'Timelion Sheet',
  [ASSET_TYPE_VISUALIZATION]: 'Visualization',
  [ASSET_TYPE_INDEX_PATTERN]: 'Index Pattern',
  [ASSET_TYPE_INGEST_PIPELINE]: 'Ingest Pipeline',
};

export const ServiceTitleMap: Record<ServiceName, string> = {
  elasticsearch: 'Elasticsearch',
  filebeat: 'Filebeat',
  kibana: 'Kibana',
  metricbeat: 'Metricbeat',
};

export const AssetIcons: Record<AssetType, IconType> = {
  config: 'advancedSettingsApp',
  visualization: 'visualizeApp',
  dashboard: 'dashboardApp',
  search: 'searchProfilerApp',
  'index-pattern': 'indexPatternApp',
  // spaces: 'spacesApp',
  'ingest-pipeline': 'pipelineApp',
  // 'index-template': 'indexManagementApp'
  // 'ilm-policy': 'reportingApp',
  'timelion-sheet': 'timelionApp',
};

export const ServiceIcons: Record<ServiceName, IconType> = {
  elasticsearch: 'logoElasticsearch',
  filebeat: 'logoBeats',
  kibana: 'logoKibana',
  metricbeat: 'logoBeats',
};
