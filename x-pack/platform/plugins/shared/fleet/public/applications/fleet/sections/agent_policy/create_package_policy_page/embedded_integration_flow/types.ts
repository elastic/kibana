/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FleetProxy,
  DownloadSource,
  AgentPolicy,
  EnrollmentAPIKey,
  PackageInfo,
  RegistryPolicyTemplate,
} from '../../../../types';
import type { EditPackagePolicyFrom } from '../types';

export interface EmbeddedIntegrationStepsLayoutProps {
  fleetServerHost: string;
  fleetProxy?: FleetProxy;
  downloadSource?: DownloadSource;
  agentPolicy?: AgentPolicy;
  error?: Error;
  enrollmentAPIKey?: EnrollmentAPIKey;
  packageInfo: PackageInfo;
  integrationInfo?: RegistryPolicyTemplate;
  cancelClickHandler?: React.ReactEventHandler;
  onBack: React.ReactEventHandler;
  steps: EmbeddedFlowStep[];
  currentStep: number;
  onNext: (params?: { selectedAgentPolicies?: AgentPolicy[]; toStep?: number }) => void;
  setIsManaged: (isManaged: boolean) => void;
  isManaged: boolean;
  setEnrolledAgentIds: (agentIds: string[]) => void;
  enrolledAgentIds: string[];
  onCancel: () => void;
  prerelease: boolean;
  handleViewAssets: () => void;
  from: EditPackagePolicyFrom;
  selectedAgentPolicies?: AgentPolicy[];
}

export interface EmbeddedIntegrationFlowProps {
  from: EditPackagePolicyFrom;
  queryParamsPolicyId?: string;
  integrationName?: string;
  prerelease: boolean;
  onCancel: () => void;
  onStepNext?: (step: number) => void;
  handleViewAssets: () => void;
}

export interface EmbeddedFlowStep {
  title: string;
  component: React.FC<EmbeddedIntegrationStepsLayoutProps>;
}
