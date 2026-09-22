/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import { NightshiftTelemetryClient } from './client';
import { semanticMemoryMaterializedEvent, semanticMemoryOptimizedEvent } from './events';

export const setupNightshiftTelemetry = ({
  analytics,
  logger,
}: {
  analytics: AnalyticsServiceSetup;
  logger: Logger;
}): NightshiftTelemetryClient => {
  analytics.registerEventType(semanticMemoryMaterializedEvent);
  analytics.registerEventType(semanticMemoryOptimizedEvent);
  return new NightshiftTelemetryClient(analytics, logger);
};

export { NightshiftTelemetryClient };
export type { SemanticMemoryMaterializedEvent, SemanticMemoryOptimizedEvent } from './events';
