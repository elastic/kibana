/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestStreamLifecycle } from '@kbn/streams-schema';
import { isInheritLifecycle, type Streams } from '@kbn/streams-schema';

/**
 * If stream does not have a `IngestStreamLifecycleInherit`, retention has been changed
 */
export function hasChangedRetention(lifecycle: IngestStreamLifecycle | undefined): boolean {
  return lifecycle !== undefined && !isInheritLifecycle(lifecycle);
}

/**
 * Returns true if a Classic stream has one or more processing steps
 */
export function hasProcessingSteps(definition: Streams.ClassicStream.Definition): boolean {
  const processors = definition.ingest?.processing?.steps as unknown[] | undefined;
  return Array.isArray(processors) && processors.length > 0;
}

/**
 * Returns true if a Classic stream defines any field overrides
 */
export function hasFieldOverrides(definition: Streams.ClassicStream.Definition): boolean {
  const fieldOverrides = definition.ingest?.classic?.field_overrides ?? {};
  return fieldOverrides && Object.keys(fieldOverrides).length > 0;
}
