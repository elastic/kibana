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
import {
  ConnectStep,
  ServicesStep,
  NameAndScopeStep,
  DeploymentStep,
  SeeDataStep,
} from './step_components';

interface StepComponentProps {
  onNext: () => void;
}

const STEP_COMPONENTS: Record<string, React.ComponentType<StepComponentProps>> = {
  connect: ConnectStep,
  services: ServicesStep,
  'name-and-scope': NameAndScopeStep,
  deployment: DeploymentStep,
  'see-data': SeeDataStep,
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
  const { euiTheme } = useEuiTheme();
  const meta = INTEGRATION_META[integrationId];

  useEffect(() => {
    if (!meta) {
      history.replace('/');
    }
  }, [meta, history]);

  const { completedSteps, markStepComplete, firstIncompleteStepId } = useStepState(integrationId);

  const currentStepId = location.hash ? location.hash.slice(1) : '';
  const isValidStep = ONBOARDING_STEPS.some((s) => s.id === currentStepId);

  useEffect(() => {
    if (meta && !isValidStep) {
      history.replace({ ...location, hash: `#${firstIncompleteStepId}` });
    }
  }, [meta, isValidStep, firstIncompleteStepId, history, location]);

  const stepsConfig: EuiStepProps[] = useMemo(
    () =>
      ONBOARDING_STEPS.map((step, index) => {
        const isCurrent = step.id === currentStepId;
        const isComplete = completedSteps.has(step.id);

        let status: EuiStepProps['status'] = 'incomplete';
        if (isCurrent) {
          status = 'current';
        } else if (isComplete) {
          status = 'complete';
        }

        const StepComponent = isCurrent ? STEP_COMPONENTS[step.id] : undefined;
        const nextStep = ONBOARDING_STEPS[index + 1];
        const onNext = () => {
          markStepComplete(step.id);
          if (nextStep) {
            history.push({ ...location, hash: `#${nextStep.id}` });
          }
        };

        return {
          title: step.title,
          status,
          children: StepComponent ? <StepComponent onNext={onNext} /> : null,
          'data-test-subj': `onboardingStepIndicator-${step.id}`,
          ...(isComplete && !isCurrent
            ? {
                onClick: () => history.push({ ...location, hash: `#${step.id}` }),
              }
            : {}),
        };
      }),
    [currentStepId, completedSteps, markStepComplete, history, location]
  );

  if (!meta || !isValidStep) {
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
            <EuiIcon type={meta.icon} size="xxl" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="l">
              <h1>{meta.title}</h1>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiText size="m" color="subdued">
              <p>{meta.description}</p>
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
