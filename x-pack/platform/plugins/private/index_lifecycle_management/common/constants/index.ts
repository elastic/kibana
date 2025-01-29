/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export { phaseToNodePreferenceMap } from './data_tiers';

import { MIN_PLUGIN_LICENSE, MIN_SEARCHABLE_SNAPSHOT_LICENSE } from './license';

export const PLUGIN = {
  ID: 'index_lifecycle_management',
  minimumLicenseType: MIN_PLUGIN_LICENSE,
  TITLE: i18n.translate('xpack.indexLifecycleMgmt.appTitle', {
    defaultMessage: 'Index Lifecycle Policies',
  }),
};

export const MAJOR_VERSION = '8.0.0';

export const API_BASE_PATH = '/api/index_lifecycle_management';

export { MIN_SEARCHABLE_SNAPSHOT_LICENSE, MIN_PLUGIN_LICENSE };
