/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import manifest from '../kibana.json';

export const PLUGIN = {
  ID: manifest.id,
  TITLE: i18n.translate('xpack.integrationsManager.pluginTitle', {
    defaultMessage: 'Integrations Manager',
  }),
  DESCRIPTION: 'Install and manage your elastic data ingest integrations',
  ICON: 'merge',
  CONFIG_PREFIX: 'xpack.integrationsManager',
};

export const SAVED_OBJECT_TYPE = 'integrations-manager';

export const ASSET_TYPE_CONFIG = 'config';
export const ASSET_TYPE_DASHBOARD = 'dashboard';
export const ASSET_TYPE_INGEST_PIPELINE = 'ingest-pipeline';
export const ASSET_TYPE_INDEX_PATTERN = 'index-pattern';
export const ASSET_TYPE_SEARCH = 'search';
export const ASSET_TYPE_TIMELION_SHEET = 'timelion-sheet';
export const ASSET_TYPE_VISUALIZATION = 'visualization';

export const STATUS_INSTALLED = 'installed';
export const STATUS_NOT_INSTALLED = 'not_installed';
