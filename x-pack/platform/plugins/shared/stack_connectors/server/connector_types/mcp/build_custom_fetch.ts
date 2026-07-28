/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfiguredFetchFactory, ConfiguredFetchResource } from '@kbn/connector-specs';

/**
 * Thin adapter: delegates all fetch policy (SSL/TLS, proxy, User-Agent, timeout, body limits)
 * to the Actions-owned `ConfiguredFetchFactory`. Callers must call `resource.close()` when
 * the session is complete to release pooled sockets.
 */
export function buildCustomFetch(
  configuredFetchFactory: ConfiguredFetchFactory,
  targetUrl: string
): ConfiguredFetchResource {
  return configuredFetchFactory({ targetUrl });
}
