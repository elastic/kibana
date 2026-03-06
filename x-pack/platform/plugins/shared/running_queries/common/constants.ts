/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const API_BASE_PATH = '/internal/running_queries';
export const PLUGIN_NAME = i18n.translate('xpack.runningQueries.pluginName', {
  defaultMessage: 'Running queries',
});

export const RUNNING_QUERIES_READ_PRIVILEGE = 'running_queries-read';
export const RUNNING_QUERIES_WRITE_PRIVILEGE = 'running_queries-write';

export const CANCELLATION_POLL_INTERVAL_MS = 5_000;

export const RUNNING_QUERIES_MIN_RUNNING_TIME_SETTING = 'running_queries:minRunningTime';
export const RUNNING_QUERIES_MIN_RUNNING_TIME_DEFAULT_MS = 100;
