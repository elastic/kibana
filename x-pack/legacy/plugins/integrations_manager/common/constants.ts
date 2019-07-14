/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import manifest from '../kibana.json';

export const PLUGIN_ID = manifest.id;
export const SAVED_OBJECT_TYPE = 'integrations-manager';

export enum AssetTypes {
  config = 'config',
  dashboard = 'dashboard',
  ingestPipeline = 'ingest-pipeline',
  indexPattern = 'index-pattern',
  search = 'search',
  timelionSheet = 'timelion-sheet',
  visualization = 'visualization',
}

export enum InstallationStatus {
  installed = 'installed',
  notInstalled = 'not_installed',
}
