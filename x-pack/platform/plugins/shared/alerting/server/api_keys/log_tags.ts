/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUiamLogTags } from '@kbn/response-ops-api-keys';

const tags = getUiamLogTags('alerting');

export const UIAM_LOGS_GRANT_TAGS = tags.grant;
export const UIAM_LOGS_INVALIDATE_TAGS = tags.invalidate;
export const UIAM_LOGS_CREDENTIALS_TAGS = tags.credentials;
export const UIAM_LOGS_USAGE_TAGS = tags.usage;
