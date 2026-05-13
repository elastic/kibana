/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { MemoryTriggerRegistry } from './registry';
export type { MemoryUpdateTrigger, MemoryUpdateContext, OutputFunction } from './types';

export {
  discoveryCompletedTrigger,
  DISCOVERY_COMPLETED_TRIGGER_ID,
} from './discovery_completed_trigger';
