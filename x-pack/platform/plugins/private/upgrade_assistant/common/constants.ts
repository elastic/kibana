/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const API_BASE_PATH = '/api/upgrade_assistant';

/**
 * This is the repository where Cloud stores its backup snapshots.
 */
export const CLOUD_SNAPSHOT_REPOSITORY = 'found-snapshots';

export const DEPRECATION_WARNING_UPPER_LIMIT = 999999;
export const DEPRECATION_LOGS_SOURCE_ID = 'deprecation_logs';
export const DEPRECATION_LOGS_INDEX = '.logs-deprecation.elasticsearch-default';
export const DEPRECATION_LOGS_INDEX_PATTERN = '.logs-deprecation.elasticsearch-default';

export const CLUSTER_UPGRADE_STATUS_POLL_INTERVAL_MS = 45000;
export const CLOUD_BACKUP_STATUS_POLL_INTERVAL_MS = 60000;
export const DEPRECATION_LOGS_COUNT_POLL_INTERVAL_MS = 15000;
export const SYSTEM_INDICES_MIGRATION_POLL_INTERVAL_MS = 15000;

/**
 * List of Elastic apps that potentially can generate deprecation logs.
 * We want to filter those out for our users so they only see deprecation logs
 * that _they_ are generating.
 */
export const APPS_WITH_DEPRECATION_LOGS = [
  'kibana',
  'cloud',
  'logstash',
  'beats',
  'fleet',
  'ml',
  'security',
  'observability',
  'enterprise-search',
];

// The field that will indicate which elastic product generated the deprecation log
export const DEPRECATION_LOGS_ORIGIN_FIELD = 'elasticsearch.elastic_product_origin';

export const APP_LOGS_COUNT_INDEX_PRIVILEGES = ['read', 'view_index_metadata'];
export const APP_LOGS_COUNT_CLUSTER_PRIVILEGES = ['manage_security'];
