/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

export const DEFAULT_SPACE_ID = 'default';

/** Resolves the active space id for an HTTP request (always set by core). */
export const resolveSpaceId = (request: KibanaRequest): string => request.spaceId;
