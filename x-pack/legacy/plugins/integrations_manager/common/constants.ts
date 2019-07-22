/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import manifest from '../kibana.json';

export const PLUGIN_ID = manifest.id;
export const SAVED_OBJECT_TYPE = 'integrations-manager';

export const ASSET_TYPE_CONFIG = 'config';
export const ASSET_TYPE_DASHBOARD = 'dashboard';
export const ASSET_TYPE_INGEST_PIPELINE = 'ingest-pipeline';
export const ASSET_TYPE_INDEX_PATTERN = 'index-pattern';
export const ASSET_TYPE_SEARCH = 'search';
export const ASSET_TYPE_TIMELION_SHEET = 'timelion-sheet';
export const ASSET_TYPE_VISUALIZATION = 'visualization';

export const ASSET_TYPES = new Set([
  ASSET_TYPE_CONFIG,
  ASSET_TYPE_DASHBOARD,
  ASSET_TYPE_INGEST_PIPELINE,
  ASSET_TYPE_INDEX_PATTERN,
  ASSET_TYPE_SEARCH,
  ASSET_TYPE_TIMELION_SHEET,
  ASSET_TYPE_VISUALIZATION,
]);

export const STATUS_INSTALLED = 'installed';
export const STATUS_NOT_INSTALLED = 'not_installed';
