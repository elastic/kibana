/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUiamLogTags } from '@kbn/response-ops-api-keys';
import { ALERTING_PLUGIN_TAG } from '../api_keys/client';

const {
  grant: UIAM_LOGS_GRANT_TAGS,
  invalidate: UIAM_LOGS_INVALIDATE_TAGS,
  credentials: UIAM_LOGS_CREDENTIALS_TAGS,
  usage: UIAM_LOGS_USAGE_TAGS,
} = getUiamLogTags(ALERTING_PLUGIN_TAG);

export {
  UIAM_LOGS_GRANT_TAGS,
  UIAM_LOGS_INVALIDATE_TAGS,
  UIAM_LOGS_CREDENTIALS_TAGS,
  UIAM_LOGS_USAGE_TAGS,
};
