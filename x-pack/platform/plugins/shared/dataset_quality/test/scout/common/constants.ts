/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DATASET_QUALITY_API_BASE = '/internal/dataset_quality';

/**
 * Internal Kibana routes reject requests without an internal-origin marker when
 * `server.restrictInternalApis` is on (the default in serverless), so every
 * request in these suites needs these headers alongside its auth header.
 */
export const COMMON_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
} as const;

export const LOGS_TYPE = 'logs';
export const DEFAULT_NAMESPACE = 'default';
export const PRODUCTION_NAMESPACE = 'production';

export const buildDataStreamName = ({
  type = LOGS_TYPE,
  dataset,
  namespace = DEFAULT_NAMESPACE,
}: {
  type?: string;
  dataset: string;
  namespace?: string;
}) => `${type}-${dataset}-${namespace}`;

/**
 * Package versions are pinned so integration-derived assertions (dataset names,
 * dashboard counts, mapped field counts) stay stable regardless of what the
 * package registry currently serves as "latest".
 */
export const PACKAGES = {
  apache: { name: 'apache', version: '1.14.0' },
  nginx: { name: 'nginx', version: '1.23.0' },
  fleetServer: { name: 'fleet_server', version: '1.6.0' },
} as const;
