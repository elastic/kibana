/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { StreamsKIsOnboardingClient } from './onboarding_workflow_client';
import { SignificantEventsDiscoveryClient } from './significant_events_discovery_client';

export interface WorkflowClients {
  streamsKIsOnboardingClient: StreamsKIsOnboardingClient | undefined;
  SignificantEventsDiscoveryClient: SignificantEventsDiscoveryClient | undefined;
}
export const createWorkflowClients = (
  managementApi: WorkflowsServerPluginSetup['management'] | undefined
): WorkflowClients => {
  if (!managementApi) {
    return { streamsKIsOnboardingClient: undefined, SignificantEventsDiscoveryClient: undefined };
  }

  return {
    streamsKIsOnboardingClient: new StreamsKIsOnboardingClient({ managementApi }),
    SignificantEventsDiscoveryClient: new SignificantEventsDiscoveryClient({ managementApi }),
  };
};
