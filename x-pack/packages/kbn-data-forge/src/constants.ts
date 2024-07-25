/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const FAKE_HOSTS = 'fake_hosts';
export const FAKE_LOGS = 'fake_logs';
export const FAKE_STACK = 'fake_stack';
export const SERVICE_LOGS = 'service.logs';
export const FAKE_STACK_DS = 'fake_stack_ds';

export const INDEX_PREFIX = 'kbn-data-forge';

export const DEFAULTS = {
  EVENTS_PER_CYCLE: 1,
  PAYLOAD_SIZE: 10_000,
  CONCURRENCY: 5,
  SERVERLESS: false,
  INDEX_INTERVAL: 60_000,
  DATASET: FAKE_LOGS,
  SCENARIO: 'good',
  ELASTICSEARCH_HOST: 'http://localhost:9200',
  ELASTICSEARCH_USERNAME: 'elastic',
  ELASTICSEARCH_PASSWORD: 'changeme',
  ELASTICSEARCH_API_KEY: '',
  SKIP_KIBANA_USER: false,
  INSTALL_KIBANA_ASSETS: false,
  DELAY_IN_MINUTES: 0,
  DELAY_EVERY_MINUTES: 5,
  LOOKBACK: 'now-15m',
  KIBANA_URL: 'http://localhost:5601',
  KIBANA_USERNAME: 'elastic',
  KIBANA_PASSWORD: 'changeme',
  EVENT_TEMPLATE: 'good',
  REDUCE_WEEKEND_TRAFFIC_BY: 0,
  EPHEMERAL_PROJECT_IDS: 0,
  ALIGN_EVENTS_TO_INTERVAL: true,
  CARDINALITY: 1,
};
