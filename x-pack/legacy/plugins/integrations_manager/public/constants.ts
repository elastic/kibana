/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IconType } from '@elastic/eui';
import { AssetType, ServiceName } from '../common/types';

export const AssetTitleMap: Record<AssetType, string> = {
  config: 'Config',
  dashboard: 'Dashboard',
  'index-pattern': 'Index Pattern',
  'ingest-pipeline': 'Ingest Pipeline',
  search: 'Saved Search',
  'timelion-sheet': 'Timelion Sheet',
  visualization: 'Visualization',
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
