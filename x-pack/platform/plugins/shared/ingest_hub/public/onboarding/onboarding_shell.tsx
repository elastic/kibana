/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { css } from '@emotion/react';
import type { EuiStepProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPageTemplate,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

import { AWS_ONBOARDING_TITLE, AWS_ONBOARDING_DESCRIPTION } from '../../common/constants';
import { ONBOARDING_STEPS } from './steps';
import { useStepState } from './use_step_state';
import { ConnectStep } from './steps/connect_step';
import { ServicesStep } from './steps/services_step';
import { NameAndScopeStep } from './steps/name_and_scope_step';
import { DeploymentStep } from './steps/deployment_step';
import { SeeDataStep } from './steps/see_data_step';

const STEP_COMPONENTS: Record<string, React.ComponentType> = {
  connect: ConnectStep,
  services: ServicesStep,
  'name-and-scope': NameAndScopeStep,
  deployment: DeploymentStep,
  'see-data': SeeDataStep,
};

const INTEGRATION_META: Record<string, { title: string; description: string }> = {
  aws: { title: AWS_ONBOARDING_TITLE, description: AWS_ONBOARDING_DESCRIPTION },
};

function formatIntegrationTitle(integrationId: string): string {
  return integrationId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function useIntegrationMeta(integrationId: string) {
  const known = INTEGRATION_META[integrationId];
  if (known) {
    return known;
  }
  return {
    title: formatIntegrationTitle(integrationId),
    description: `Collect logs and metrics from ${formatIntegrationTitle(integrationId)}.`,
  };
}

export function OnboardingShell() {
  const { integrationId } = useParams<{ integrationId: string }>();
  const history = useHistory();
  const location = useLocation();
  const { euiTheme } = useEuiTheme();
  const { completedSteps, firstIncompleteStepId } = useStepState(integrationId);
  const { title, description } = useIntegrationMeta(integrationId);

  const currentStepId = location.hash ? location.hash.slice(1) : '';
  const isValidStep = ONBOARDING_STEPS.some((s) => s.id === currentStepId);

  useEffect(() => {
    if (!isValidStep) {
      history.replace({ ...location, hash: `#${firstIncompleteStepId}` });
    }
  }, [isValidStep, firstIncompleteStepId, history, location]);

  const stepsConfig: EuiStepProps[] = useMemo(
    () =>
      ONBOARDING_STEPS.map((step) => {
        const isCurrent = step.id === currentStepId;
        const isComplete = completedSteps.has(step.id);

        let status: EuiStepProps['status'] = 'incomplete';
        if (isCurrent) {
          status = 'current';
        } else if (isComplete) {
          status = 'complete';
        }

        const StepComponent = isCurrent ? STEP_COMPONENTS[step.id] : undefined;

        return {
          title: step.title,
          status,
          children: StepComponent ? <StepComponent /> : null,
          'data-test-subj': `onboardingStepIndicator-${step.id}`,
          ...(isComplete && !isCurrent
            ? {
                onClick: () => history.push({ ...location, hash: `#${step.id}` }),
              }
            : {}),
        };
      }),
    [currentStepId, completedSteps, history, location]
  );

  if (!isValidStep) {
    return null;
  }

  return (
    <EuiPageTemplate data-test-subj="onboardingShell">
      <EuiPageTemplate.Section
        grow={false}
        paddingSize="l"
        restrictWidth
        css={css`
          border-bottom: ${euiTheme.border.thin};
        `}
      >
        <EuiFlexGroup alignItems="center" gutterSize="l">
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoAWS" size="xxl" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="l">
              <h1>{title}</h1>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiText size="m" color="subdued">
              <p>{description}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section paddingSize="xl" restrictWidth>
        <EuiSteps steps={stepsConfig} data-test-subj="onboardingStepIndicator" />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
}
