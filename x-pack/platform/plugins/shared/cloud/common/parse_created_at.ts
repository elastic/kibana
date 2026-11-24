/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

/**
 * Parses the `xpack.cloud.serverless.created_at` setting (an ISO-8601 timestamp) into a `Date`.
 *
 * @param value The raw setting value.
 * @param logger Used to report a value that is set but cannot be parsed.
 * @returns The creation time, or `undefined` if the setting is missing or invalid.
 */
export function parseCreatedAt(value: string | undefined, logger: Logger): Date | undefined {
  if (!value) return undefined;

  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) {
    logger.error('cloud.serverless.created_at config value could not be parsed.');
    return undefined;
  }
  return createdAt;
}
