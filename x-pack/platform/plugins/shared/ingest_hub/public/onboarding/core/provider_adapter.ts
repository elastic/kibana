/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsStaticKeyCredentials } from '@kbn/fleet-plugin/public';
import type {
  AgentBasedDeploymentState,
  AuthenticateAndDeployStepState,
  DetectAndReviewStepState,
} from '../onboarding_flow_context';
import type { AwsServiceMatrixEntry, DeploymentMethod } from '../aws_service_matrix';

/**
 * Contract that any cloud-provider adapter must satisfy to integrate with the
 * onboarding flow core.
 *
 * PR 1 of the modularisation plan (https://github.com/elastic/ingest-dev/issues/9598)
 * scaffolds the interface without wiring it.  Subsequent PRs will extract the
 * AWS implementation and inject it into OnboardingFlowContext via this type.
 */
export interface ProviderAdapter {
  // ---- read ----------------------------------------------------------------

  readonly authenticateAndDeployStep: AuthenticateAndDeployStepState;
  readonly agentBasedDeployment: AgentBasedDeploymentState;
  readonly deploymentMethod: DeploymentMethod;
  readonly detectAndReviewStep: DetectAndReviewStepState;
  readonly serviceMatrix: AwsServiceMatrixEntry[] | undefined;
  readonly serviceMatrixMap: Map<string, AwsServiceMatrixEntry> | undefined;
  readonly serviceMatrixError: boolean;
  /** False while the default data format is being resolved (async spaces lookup). */
  readonly isDataFormatResolved: boolean;

  // ---- write ---------------------------------------------------------------

  setConnectorId(id: string | undefined, name?: string): void;
  setStaticKeys(keys: AwsStaticKeyCredentials | undefined): void;
  setAgentBasedDeployment(state: Partial<AgentBasedDeploymentState>): void;
  setDeploymentMethod(method: DeploymentMethod): void;
  updateDetectAndReviewStep(update: Partial<DetectAndReviewStepState>): void;
  removeDeployInstance(instanceId: string): void;
  getLatestFailedInstances(): string[];
  refetchServiceMatrix(): void;
}
