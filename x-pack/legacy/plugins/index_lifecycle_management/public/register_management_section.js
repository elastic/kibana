/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import chrome from 'ui/chrome';
import { management } from 'ui/management';
import { i18n } from '@kbn/i18n';
import { BASE_PATH } from '../common/constants';
const esSection = management.getSection('elasticsearch');
if (chrome.getInjected('ilmUiEnabled')) {
  esSection.register('index_lifecycle_policies', {
    visible: true,
    display: i18n.translate('xpack.indexLifecycleMgmt.appTitle', {
      defaultMessage: 'Index Lifecycle Policies',
    }),
    order: 2,
    url: `#${BASE_PATH}policies`,
  });
}
