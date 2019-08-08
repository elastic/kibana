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
