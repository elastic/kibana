/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';

import type { Output } from '../../../common/types';

/**
 * Returns an output without its sensitive fields (keys, passwords, tokens, headers, secret
 * references), for API responses to users who cannot read Fleet settings.
 *
 * Keep in sync with OUTPUT_ENCRYPTED_FIELDS.
 */
export function sanitizeOutput<T extends Output = Output>(output: T): T {
  const sanitized = omit(output, [
    'secrets',
    'password',
    'service_token',
    // Kafka headers can carry credentials
    'headers',
  ]) as Record<string, unknown>;

  if ('ssl' in output && output.ssl) {
    sanitized.ssl = omit(output.ssl, ['key']);
  }

  return sanitized as T;
}
