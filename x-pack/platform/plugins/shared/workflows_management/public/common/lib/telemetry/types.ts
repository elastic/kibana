/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import type { AllWorkflowEventTypes, WorkflowsTelemetryEventsMap } from './events/workflows/types';

export interface TelemetryServiceSetupParams {
  analytics: AnalyticsServiceSetup;
}

export interface TelemetryServiceClient {
  reportEvent: <T extends AllWorkflowEventTypes>(
    eventType: T,
    eventData: WorkflowsTelemetryEventsMap[T]
  ) => void;
}

export type TelemetryEventTypes = AllWorkflowEventTypes;
export type TelemetryEventTypeData<T extends TelemetryEventTypes> = WorkflowsTelemetryEventsMap[T];
