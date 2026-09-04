/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { SignificantEventsKIsOnboardingClient } from './onboarding_workflow_client';
import { SignificantEventsDiscoveryClient } from './significant_events_discovery_client';
import { SignificantEventsCodeExtractionClient } from './code_extraction_workflow_client';
import type { EbtTelemetryClient } from '../telemetry/ebt/client';

export interface WorkflowClients {
  streamsKIsOnboardingClient: SignificantEventsKIsOnboardingClient | undefined;
  significantEventsDiscoveryClient: SignificantEventsDiscoveryClient | undefined;
  codeExtractionClient: SignificantEventsCodeExtractionClient | undefined;
}
export const createWorkflowClients = (
  managementApi: WorkflowsServerPluginSetup['management'] | undefined,
  telemetry: EbtTelemetryClient
): WorkflowClients => {
  if (!managementApi) {
    return {
      streamsKIsOnboardingClient: undefined,
      significantEventsDiscoveryClient: undefined,
      codeExtractionClient: undefined,
    };
  }

  return {
    streamsKIsOnboardingClient: new SignificantEventsKIsOnboardingClient({
      managementApi,
      telemetry,
    }),
    significantEventsDiscoveryClient: new SignificantEventsDiscoveryClient({ managementApi }),
    codeExtractionClient: new SignificantEventsCodeExtractionClient({ managementApi }),
  };
};
