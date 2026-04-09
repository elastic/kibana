/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const API_BASE_PATH = '/internal/query_activity';
export const PLUGIN_NAME = i18n.translate('xpack.queryActivity.pluginName', {
  defaultMessage: 'Query activity',
});

export const QUERY_ACTIVITY_READ_PRIVILEGE = 'query_activity-read';
export const QUERY_ACTIVITY_WRITE_PRIVILEGE = 'query_activity-write';

export const CANCELLATION_POLL_INTERVAL_MS = 5_000;

export const QUERY_ACTIVITY_MIN_RUNNING_TIME_SETTING = 'query_activity:minRunningTime';
export const QUERY_ACTIVITY_MIN_RUNNING_TIME_DEFAULT_MS = 100;
