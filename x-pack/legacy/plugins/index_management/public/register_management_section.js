/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { management } from 'ui/management';
import { i18n } from '@kbn/i18n';
import { BASE_PATH } from '../common/constants';

const esSection = management.getSection('elasticsearch');
esSection.register('index_management', {
  visible: true,
  display: i18n.translate('xpack.idxMgmt.appTitle', { defaultMessage: 'Index Management' }),
  order: 1,
  url: `#${BASE_PATH}indices`,
});
