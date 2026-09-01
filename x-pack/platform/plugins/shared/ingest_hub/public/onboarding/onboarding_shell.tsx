/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';

import { FormattedMessage } from '@kbn/i18n-react';
import { AWS_ONBOARDING_TITLE, AWS_ONBOARDING_DESCRIPTION } from '../../common/constants';
import { ONBOARDING_STEPS } from './steps';
import { useStepState } from './use_step_state';
import { useInvalidateDownstreamSteps } from './use_invalidate_downstream_steps';
import { useOnboardingFlow } from './onboarding_flow_context';
import {
  AuthenticateAndDeployStep,
  ServicesStep,
  ServiceSettingsStep,
  DeployAndDetectStep,
} from './step_components';

const DOWNSTREAM_OF_SERVICES_STEP_IDS = ONBOARDING_STEPS.slice(1).map((s) => s.id);

export interface StepComponentProps {
  onContinue: () => void;
  onBack?: () => void;
}

const STEP_COMPONENTS: Record<string, React.ComponentType<StepComponentProps>> = {
  'authenticate-and-deploy': AuthenticateAndDeployStep,
  services: ServicesStep,
  'service-settings': ServiceSettingsStep,
  'deploy-and-detect': DeployAndDetectStep,
};

interface IntegrationMeta {
  title: string;
  description: string;
  icon: string;
}

const INTEGRATION_META: Record<string, IntegrationMeta> = {
  aws: { title: AWS_ONBOARDING_TITLE, description: AWS_ONBOARDING_DESCRIPTION, icon: 'logoAWS' },
};

export function OnboardingShell() {
  const { integrationId } = useParams<{ integrationId: string }>();
  const history = useHistory();
  const location = useLocation();
  const meta = INTEGRATION_META[integrationId];

  useEffect(() => {
    if (!meta) {
      history.replace('/');
    }
  }, [meta, history]);

  const { completedSteps, markStepComplete, markStepsIncomplete, firstIncompleteStepId } =
    useStepState(integrationId);

  const { servicesStep, awsServiceMatrix, awsServiceMatrixError, refetchAwsServiceMatrix } =
    useOnboardingFlow();
  const { selectedServiceIds } = servicesStep;

  useInvalidateDownstreamSteps({
    selectedServiceIds,
    downstreamStepIds: DOWNSTREAM_OF_SERVICES_STEP_IDS,
    markStepsIncomplete,
  });

  const currentStepId = location.hash ? location.hash.slice(1) : '';
  const isValidStep = ONBOARDING_STEPS.some((s) => s.id === currentStepId);

  useEffect(() => {
    if (meta && !isValidStep) {
      history.replace({ ...location, hash: `#${firstIncompleteStepId}` });
    }
  }, [meta, isValidStep, firstIncompleteStepId, history, location]);

  const currentStepIndex = ONBOARDING_STEPS.findIndex((s) => s.id === currentStepId);

  const onContinue = useMemo(() => {
    const nextStep = ONBOARDING_STEPS[currentStepIndex + 1];
    return () => {
      markStepComplete(currentStepId);
      if (nextStep) {
        history.push({ ...location, hash: `#${nextStep.id}` });
      }
    };
  }, [currentStepId, currentStepIndex, markStepComplete, history, location]);

  const onBack = useMemo(() => {
    if (currentStepIndex <= 0) return undefined;
    const prevStep = ONBOARDING_STEPS[currentStepIndex - 1];
    return () => history.push({ ...location, hash: `#${prevStep.id}` });
  }, [currentStepIndex, history, location]);

  const horizontalStepsConfig = useMemo(
    () =>
      ONBOARDING_STEPS.map((step) => {
        const isComplete = completedSteps.has(step.id);
        const isCurrent = step.id === currentStepId;
        return {
          title: step.title,
          status: (isComplete ? 'complete' : isCurrent ? 'current' : 'incomplete') as
            | 'complete'
            | 'current'
            | 'incomplete',
          onClick:
            isComplete || isCurrent
              ? () => history.push({ ...location, hash: `#${step.id}` })
              : () => {},
          'data-test-subj': `onboardingStepIndicator-${step.id}`,
        };
      }),
    [completedSteps, currentStepId, history, location]
  );

  if (!meta || !isValidStep) {
    return null;
  }

  const CurrentStepComponent = STEP_COMPONENTS[currentStepId];

  return (
    <EuiPageTemplate data-test-subj="onboardingShell">
      <EuiPageTemplate.Section paddingSize="m" restrictWidth>
        <EuiFlexGroup direction="column" alignItems="center" gutterSize="s">
          <EuiFlexGroup direction="row" alignItems="flexEnd" gutterSize="m">
            <EuiIcon type={meta.icon} size="xl" aria-hidden={true} />
            <EuiTitle
              size="l"
              css={css`
                text-align: center;
              `}
            >
              <h1>{meta.title}</h1>
            </EuiTitle>
          </EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiText
              size="m"
              color="subdued"
              css={css`
                text-align: center;
              `}
            >
              <p>{meta.description}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiStepsHorizontal steps={horizontalStepsConfig} />
        <EuiSpacer size="xl" />
        {awsServiceMatrixError ? (
          <KbnDangerCallout
            announceOnMount
            title={
              <FormattedMessage
                id="xpack.ingestHub.onboardingShell.matrixError.title"
                defaultMessage="Failed to load AWS integration catalog"
              />
            }
            actionProps={{
              primary: {
                children: (
                  <FormattedMessage
                    id="xpack.ingestHub.onboardingShell.matrixError.retry"
                    defaultMessage="Retry"
                  />
                ),
                onClick: refetchAwsServiceMatrix,
              },
            }}
          />
        ) : !awsServiceMatrix ? (
          <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: '300px' }}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexGroup>
        ) : (
          CurrentStepComponent && <CurrentStepComponent onContinue={onContinue} onBack={onBack} />
        )}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
}
