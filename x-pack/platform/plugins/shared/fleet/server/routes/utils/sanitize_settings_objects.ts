/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';

import type { DownloadSource, FleetServerHost, Output } from '../../../common/types';

/**
 * Returns an output without its sensitive fields (keys, passwords, tokens, secret references),
 * for API responses to users who cannot read Fleet settings.
 *
 * Keep in sync with OUTPUT_ENCRYPTED_FIELDS.
 */
export function sanitizeOutput<T extends Output = Output>(output: T): T {
  const sanitized = omit(output, [
    'secrets',
    'password',
    'service_token',
    'kibana_api_key',
  ]) as Record<string, unknown>;

  if ('ssl' in output && output.ssl) {
    sanitized.ssl = omit(output.ssl, ['key']);
  }

  return sanitized as T;
}

/**
 * Returns a download source without its sensitive fields, for API responses to users who cannot
 * read Fleet settings.
 *
 * Keep in sync with DOWNLOAD_SOURCE_ENCRYPTED_FIELDS.
 */
export function sanitizeDownloadSource(downloadSource: DownloadSource): DownloadSource {
  const sanitized: DownloadSource = omit(downloadSource, ['secrets']);

  if (downloadSource.ssl) {
    sanitized.ssl = omit(downloadSource.ssl, ['key']);
  }
  if (downloadSource.auth) {
    sanitized.auth = omit(downloadSource.auth, ['password', 'api_key', 'headers']);
  }

  return sanitized;
}

/**
 * Returns a Fleet Server host without its sensitive fields, for API responses to users who cannot
 * read Fleet settings.
 *
 * Keep in sync with FLEET_SERVER_HOST_ENCRYPTED_FIELDS.
 */
export function sanitizeFleetServerHost(host: FleetServerHost): FleetServerHost {
  const sanitized: FleetServerHost = omit(host, ['secrets']);

  if (host.ssl) {
    sanitized.ssl = omit(host.ssl, ['key', 'es_key', 'agent_key']);
  }

  return sanitized;
}
