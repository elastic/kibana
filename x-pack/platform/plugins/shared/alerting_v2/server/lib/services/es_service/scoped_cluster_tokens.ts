/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { ServiceIdentifier } from 'inversify';

/**
 * Request-scoped Elasticsearch cluster client (current + internal users), used when
 * enrichers need the same access pattern as other rule execution code.
 */
export const ScopedClusterClientToken = Symbol.for(
  'alerting_v2.ScopedClusterClient'
) as ServiceIdentifier<IScopedClusterClient>;
