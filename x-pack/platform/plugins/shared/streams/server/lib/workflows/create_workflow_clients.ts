/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { StreamsKIsOnboardingClient } from './onboarding_workflow_client';
import { SignificantEventsDiscoveryClient } from './significant_events_discovery_client';
import { createSyncWorkflowService } from './sync_workflow';
import type { EbtTelemetryClient } from '../telemetry/ebt/client';

export interface WorkflowClients {
  streamsKIsOnboardingClient: StreamsKIsOnboardingClient | undefined;
  significantEventsDiscoveryClient: SignificantEventsDiscoveryClient | undefined;
}
export const createWorkflowClients = (
  managementApi: WorkflowsServerPluginSetup['management'] | undefined,
  telemetry: EbtTelemetryClient,
  logger: Logger
): WorkflowClients => {
  if (!managementApi) {
    return { streamsKIsOnboardingClient: undefined, significantEventsDiscoveryClient: undefined };
  }

  const syncWorkflowService = createSyncWorkflowService({ logger, managementApi });

  return {
    streamsKIsOnboardingClient: new StreamsKIsOnboardingClient({
      managementApi,
      telemetry,
      syncWorkflowService,
    }),
    significantEventsDiscoveryClient: new SignificantEventsDiscoveryClient({ managementApi }),
  };
};
