/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestStreamLifecycle } from '@kbn/streams-schema';

/**
 * Determines if a stream has changed retention from the default.
 *
 * @param lifecycle - The stream's lifecycle configuration
 * @returns true if retention is changed from default, false otherwise
 *
 * Simple logic:
 * - inherit: {} = Default retention (false)
 * - dsl: {} = Forever retention (true)
 * - dsl: { data_retention: "30d" } = Custom retention (true)
 * - ilm: { policy: "policy" } = ILM retention (true)
 */
export function hasChangedRetention(lifecycle: IngestStreamLifecycle | undefined): boolean {
  return !!(lifecycle && 'dsl' in lifecycle);
}

export const isDevMode = () => process.env.NODE_ENV !== 'production';
