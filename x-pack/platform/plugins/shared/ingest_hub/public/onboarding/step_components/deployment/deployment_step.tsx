/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { EuiButton, EuiSpacer, EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { CloudOnboardingDeployment } from '@kbn/fleet-plugin/common/types/models/cloud_onboarding_deployment';
import type { AwsServiceVarsSource } from '@kbn/fleet-plugin/public/components/cloud_connector/aws_cloud_connector/aws_services_matrix';

import { computeRequiredStacks, type RequiredStack } from './compute_required_stacks';
import { DeploymentStackSection } from './deployment_stack_section';
import {
  useCreateDeployment,
  usePrepareDeployment,
  useCompleteDeployment,
  useUpdateDeployment,
} from './use_deployment_api';

interface PrepareResult {
  templateUrl: string;
  templateParameters: Record<string, string>;
  cliCommand: string;
  apiKeyId?: string;
}

interface StackState {
  deploymentId: string | null;
  deployment: CloudOnboardingDeployment | null;
  prepareResult: PrepareResult | null;
  isCreating: boolean;
}

export const DeploymentStep: React.FC = () => {
  // TODO: Replace with OnboardingFlowContext from PR #271195
  const selectedServices = useMemo(() => [], []);
  const serviceVars = useMemo<Record<string, AwsServiceVarsSource[]>>(() => ({}), []);
  const authType = 'identity_federation' as const;
  const isNewConnection = true;
  const connectorId = '';

  const requiredStacks = useMemo(
    () =>
      computeRequiredStacks({
        selectedServices,
        serviceVars,
        authType,
        isNewConnection,
      }),
    [selectedServices, serviceVars, authType, isNewConnection]
  );

  const [stackStates, setStackStates] = useState<Record<string, StackState>>({});
  const { createDeployment, isLoading: isCreateLoading } = useCreateDeployment();
  const { prepareDeployment, isLoading: isPrepareLoading } = usePrepareDeployment();
  const { completeDeployment } = useCompleteDeployment();
  const { updateDeployment } = useUpdateDeployment();

  const initializeStack = useCallback(
    async (stack: RequiredStack) => {
      if (!connectorId) return;

      setStackStates((prev) => ({
        ...prev,
        [stack.mechanism]: {
          deploymentId: null,
          deployment: null,
          prepareResult: null,
          isCreating: true,
        },
      }));

      try {
        const deployment = await createDeployment({
          provider: 'aws',
          connectorId,
          mechanisms: [stack.mechanism === 'identity_federation' ? 'agentless' : stack.mechanism],
          services: stack.services.map((s) => s.id),
          serviceVars: stack.serviceVars,
        });

        const prepared = await prepareDeployment(deployment.id);

        setStackStates((prev) => ({
          ...prev,
          [stack.mechanism]: {
            deploymentId: deployment.id,
            deployment,
            prepareResult: prepared,
            isCreating: false,
          },
        }));
      } catch {
        setStackStates((prev) => ({
          ...prev,
          [stack.mechanism]: {
            ...prev[stack.mechanism],
            isCreating: false,
          },
        }));
      }
    },
    [connectorId, createDeployment, prepareDeployment]
  );

  useEffect(() => {
    for (const stack of requiredStacks) {
      if (!stackStates[stack.mechanism]) {
        initializeStack(stack);
      }
    }
  }, [requiredStacks, stackStates, initializeStack]);

  const handleConfirmDeployed = useCallback(
    async (mechanism: string) => {
      const state = stackStates[mechanism];
      if (!state?.deploymentId) return;

      await updateDeployment(state.deploymentId, { status: 'deploying' });
      await completeDeployment(state.deploymentId);

      const deployment = { ...state.deployment!, status: 'succeeded' as const };
      setStackStates((prev) => ({
        ...prev,
        [mechanism]: { ...prev[mechanism], deployment },
      }));
    },
    [stackStates, updateDeployment, completeDeployment]
  );

  const handleRetry = useCallback(
    async (mechanism: string) => {
      const state = stackStates[mechanism];
      if (!state?.deploymentId || !state.deployment) return;

      await updateDeployment(state.deploymentId, {
        status: 'pending',
        attemptCount: state.deployment.attemptCount + 1,
      });

      const prepared = await prepareDeployment(state.deploymentId);

      setStackStates((prev) => ({
        ...prev,
        [mechanism]: {
          ...prev[mechanism],
          deployment: {
            ...prev[mechanism].deployment!,
            status: 'pending',
            attemptCount: prev[mechanism].deployment!.attemptCount + 1,
          },
          prepareResult: prepared,
        },
      }));
    },
    [stackStates, updateDeployment, prepareDeployment]
  );

  const allSucceeded =
    requiredStacks.length > 0 &&
    requiredStacks.every(
      (stack) => stackStates[stack.mechanism]?.deployment?.status === 'succeeded'
    );

  if (requiredStacks.length === 0) {
    return (
      <EuiText data-test-subj="onboardingStep-deployment">
        <p>No deployment stacks required for the selected services.</p>
      </EuiText>
    );
  }

  return (
    <div data-test-subj="onboardingStep-deployment">
      <EuiText>
        <h2>Deploy AWS Resources</h2>
        <p>
          Deploy the required CloudFormation stacks to connect your AWS services to Elastic. Copy
          the template or CLI command, create the stack in your AWS account, then confirm below.
        </p>
      </EuiText>

      <EuiSpacer size="l" />

      <EuiFlexGroup direction="column" gutterSize="l">
        {requiredStacks.map((stack) => {
          const state = stackStates[stack.mechanism];
          return (
            <EuiFlexItem key={stack.mechanism}>
              <DeploymentStackSection
                stack={stack}
                deployment={state?.deployment ?? null}
                prepareResult={state?.prepareResult ?? null}
                isPreparingOrCreating={state?.isCreating ?? isCreateLoading ?? isPrepareLoading}
                onConfirmDeployed={() => handleConfirmDeployed(stack.mechanism)}
                onRetry={() => handleRetry(stack.mechanism)}
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <EuiButton fill disabled={!allSucceeded} data-test-subj="deploymentContinueButton">
        Continue
      </EuiButton>
    </div>
  );
};
