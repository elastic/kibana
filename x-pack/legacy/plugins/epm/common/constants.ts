/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import manifest from '../kibana.json';

export const PLUGIN = {
  ID: manifest.id,
  TITLE: i18n.translate('xpack.epm.pluginTitle', {
    defaultMessage: 'Elastic Package Manager',
  }),
  DESCRIPTION: 'Install and manage your Elastic data ingest packages',
  ICON: 'merge',
  CONFIG_PREFIX: 'xpack.epm',
};

export const SAVED_OBJECT_TYPE_PACKAGES = 'epm-package';
// This is actually controled by Ingest
// Ultimately, EPM should a) import this or b) not know about it at all
export const SAVED_OBJECT_TYPE_DATASOURCES = 'datasources';
