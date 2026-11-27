/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PROFILES_API_PATH, RULES_API_PATH } from '../../../../common/constants';

export { apiTest } from '@kbn/scout';

// `apiClient` expects a path relative to the Kibana base URL (no leading slash).
export const PROFILES_PATH = PROFILES_API_PATH.replace(/^\//, '');
export const RULES_PATH = RULES_API_PATH.replace(/^\//, '');

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
};
