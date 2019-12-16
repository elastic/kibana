/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';
import { BASE_PATH, PLUGIN } from '../common/constants';

npStart.plugins.management.legacy.getSection('elasticsearch').register('license_management', {
  visible: true,
  display: PLUGIN.TITLE,
  order: 99,
  url: `#${BASE_PATH}home`,
});
