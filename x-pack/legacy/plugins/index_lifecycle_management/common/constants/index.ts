/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const PLUGIN = {
  ID: 'index_lifecycle_management',
  TITLE: i18n.translate('xpack.indexLifecycleMgmt.appTitle', {
    defaultMessage: 'Index Lifecycle Policies',
  }),
};

export const BASE_PATH = '/management/elasticsearch/index_lifecycle_management/';
