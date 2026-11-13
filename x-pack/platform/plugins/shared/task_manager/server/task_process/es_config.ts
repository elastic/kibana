/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { ByteSizeValue } from '@kbn/config-schema';
import {
  ElasticsearchConfig,
  configSchema,
} from '@kbn/core-elasticsearch-server-internal/src/elasticsearch_config';
import type {
  ElasticsearchClientConfig,
  IElasticsearchConfig,
} from '@kbn/core-elasticsearch-server';

/**
 * Kibana's Elasticsearch client settings as JSON, so Kibana can hand its own connection to a task
 * process over the fork channel. Certificates are already file contents in Core's config, so the
 * process needs nothing from disk.
 */
export interface SerializedElasticsearchConfig {
  hosts: string[];
  username?: string;
  password?: string;
  serviceAccountToken?: string;
  customHeaders: Record<string, string>;
  requestHeadersWhitelist: string[];
  maxSockets: number;
  maxIdleSockets: number;
  maxResponseSizeBytes?: number;
  idleSocketTimeoutMs: number;
  dnsCacheTtlMs: number;
  requestTimeoutMs: number;
  sniffIntervalMs: number | false;
  sniffOnStart: boolean;
  sniffOnConnectionFault: boolean;
  compression: boolean;
  ssl: NonNullable<ElasticsearchClientConfig['ssl']>;
  apisToRedactInLogs?: ElasticsearchClientConfig['apisToRedactInLogs'];
}

export const serializeElasticsearchConfig = (
  config: IElasticsearchConfig & { maxResponseSize?: ByteSizeValue }
): SerializedElasticsearchConfig => ({
  hosts: config.hosts,
  username: config.username,
  password: config.password,
  serviceAccountToken: config.serviceAccountToken,
  customHeaders: config.customHeaders,
  requestHeadersWhitelist: config.requestHeadersWhitelist,
  maxSockets: config.maxSockets,
  maxIdleSockets: config.maxIdleSockets,
  maxResponseSizeBytes: config.maxResponseSize?.getValueInBytes(),
  idleSocketTimeoutMs: config.idleSocketTimeout.asMilliseconds(),
  dnsCacheTtlMs: config.dnsCacheTtl.asMilliseconds(),
  requestTimeoutMs: config.requestTimeout.asMilliseconds(),
  sniffIntervalMs: config.sniffInterval ? config.sniffInterval.asMilliseconds() : false,
  sniffOnStart: config.sniffOnStart,
  sniffOnConnectionFault: config.sniffOnConnectionFault,
  compression: config.compression,
  ssl: { ...config.ssl },
  apisToRedactInLogs: config.apisToRedactInLogs,
});

export const reviveElasticsearchConfig = (
  serialized: SerializedElasticsearchConfig
): ElasticsearchClientConfig => ({
  hosts: serialized.hosts,
  username: serialized.username,
  password: serialized.password,
  serviceAccountToken: serialized.serviceAccountToken,
  customHeaders: serialized.customHeaders,
  requestHeadersWhitelist: serialized.requestHeadersWhitelist,
  maxSockets: serialized.maxSockets,
  maxIdleSockets: serialized.maxIdleSockets,
  maxResponseSize:
    serialized.maxResponseSizeBytes !== undefined
      ? new ByteSizeValue(serialized.maxResponseSizeBytes)
      : undefined,
  idleSocketTimeout: moment.duration(serialized.idleSocketTimeoutMs),
  dnsCacheTtl: moment.duration(serialized.dnsCacheTtlMs),
  requestTimeout: moment.duration(serialized.requestTimeoutMs),
  sniffInterval:
    serialized.sniffIntervalMs === false ? false : moment.duration(serialized.sniffIntervalMs),
  sniffOnStart: serialized.sniffOnStart,
  sniffOnConnectionFault: serialized.sniffOnConnectionFault,
  compression: serialized.compression,
  ssl: serialized.ssl,
  apisToRedactInLogs: serialized.apisToRedactInLogs,
});

/**
 * The connection of a remote process, from the environment: `ES_URL` and `ES_API_KEY` or
 * `ES_USERNAME`/`ES_PASSWORD`. Everything else is Core's default.
 */
export const elasticsearchConfigFromEnv = (
  env: NodeJS.ProcessEnv = process.env
): SerializedElasticsearchConfig => {
  if (!env.ES_URL) throw new Error('ES_URL is required');
  if (!env.ES_API_KEY && !(env.ES_USERNAME && env.ES_PASSWORD)) {
    throw new Error('Set ES_API_KEY, or both ES_USERNAME and ES_PASSWORD');
  }
  // Credentials skip the schema on purpose: it forbids the `elastic` superuser, which is a
  // legitimate user for a remote process in development.
  const validated = configSchema.validate(
    {
      hosts: env.ES_URL.split(',').map((host) => host.trim()),
      customHeaders: env.ES_API_KEY ? { authorization: `ApiKey ${env.ES_API_KEY}` } : {},
    },
    { dev: false, prod: true, dist: true, serverless: false }
  );
  const credentials = env.ES_API_KEY
    ? {}
    : { username: env.ES_USERNAME, password: env.ES_PASSWORD };
  return serializeElasticsearchConfig(new ElasticsearchConfig({ ...validated, ...credentials }));
};
