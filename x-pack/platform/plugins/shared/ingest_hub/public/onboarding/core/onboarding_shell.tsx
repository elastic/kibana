/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { css } from '@emotion/react';
import {
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getOnboardingProvider } from './provider_registry';
import { ONBOARDING_STEPS } from './steps';
import { useStepState } from './use_step_state';
import { useInvalidateDownstreamSteps } from './use_invalidate_downstream_steps';
import { discardSessionOnUnmount } from './onboarding_session_storage';
import { DEFAULT_RETURN_APP, getReturnUrl } from './return_url';
import { useOnboardingFlow } from '../onboarding_flow_context';
import {
  AuthenticateAndDeployStep,
  ServicesStep,
  ServiceSettingsStep,
  DetectAndReviewStep,
} from '../step_components';

const DOWNSTREAM_OF_SERVICES_STEP_IDS = ONBOARDING_STEPS.slice(1).map((s) => s.id);

export interface StepComponentProps {
  onContinue: () => void;
  onBack?: () => void;
}

const STEP_COMPONENTS: Record<string, React.ComponentType<StepComponentProps>> = {
  'authenticate-and-deploy': AuthenticateAndDeployStep,
  services: ServicesStep,
  'service-settings': ServiceSettingsStep,
  'detect-and-review': DetectAndReviewStep,
};

export function OnboardingShell() {
  const { integrationId } = useParams<{ integrationId: string }>();
  const history = useHistory();
  const location = useLocation();
  const meta = getOnboardingProvider(integrationId)?.meta;
  const { services } = useKibana<CoreStart>();
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const cancelModalTitleId = useGeneratedHtmlId();
  const { euiTheme } = useEuiTheme();

  useEffect(() => {
    if (!meta) {
      history.replace('/');
    }
  }, [meta, history]);

  const { completedSteps, markStepComplete, markStepsIncomplete, firstIncompleteStepId } =
    useStepState(integrationId);

  const {
    servicesStep,
    awsServiceMatrix,
    awsServiceMatrixError,
    refetchAwsServiceMatrix,
    isDataFormatResolved,
    detectAndReviewStep,
  } = useOnboardingFlow();
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
      history.replace({ ...history.location, hash: `#${firstIncompleteStepId}` });
    }
  }, [meta, isValidStep, firstIncompleteStepId, history]);

  const currentStepIndex = ONBOARDING_STEPS.findIndex((s) => s.id === currentStepId);

  const onContinue = useMemo(() => {
    const nextStep = ONBOARDING_STEPS[currentStepIndex + 1];
    return () => {
      markStepComplete(currentStepId);
      if (nextStep) {
        history.push({ ...history.location, hash: `#${nextStep.id}` });
      }
    };
  }, [currentStepId, currentStepIndex, markStepComplete, history]);

  // The first step has no previous step: Back there cancels the flow, after a confirmation.
  const onBack = useMemo(() => {
    if (currentStepIndex < 0) return undefined;
    if (currentStepIndex === 0) return () => setIsCancelModalOpen(true);
    const prevStep = ONBOARDING_STEPS[currentStepIndex - 1];
    return () => history.push({ ...history.location, hash: `#${prevStep.id}` });
  }, [currentStepIndex, history]);

  // Once something is deployed (resumed with ?deploymentId=, or deployed in this session), leaving
  // only drops the unsaved changes: the policies stay in Fleet.
  const hasDeployment =
    new URLSearchParams(location.search).has('deploymentId') ||
    Object.keys(detectAndReviewStep.serviceStatuses).length > 0 ||
    Object.keys(detectAndReviewStep.policyIdsByInstance).length > 0;

  const handleCancelFlow = useCallback(() => {
    const returnUrl = getReturnUrl(integrationId);
    // Not cleared here: the step state hooks would write it back before the app unmounts.
    discardSessionOnUnmount(integrationId);
    setIsCancelModalOpen(false);
    if (returnUrl) {
      services.application?.navigateToUrl(returnUrl);
    } else {
      services.application?.navigateToApp(DEFAULT_RETURN_APP);
    }
  }, [integrationId, services.application]);

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
              ? () => history.push({ ...history.location, hash: `#${step.id}` })
              : () => {},
          'data-test-subj': `onboardingStepIndicator-${step.id}`,
        };
      }),
    [completedSteps, currentStepId, history]
  );

  if (!meta || !isValidStep) {
    return null;
  }

  const CurrentStepComponent = STEP_COMPONENTS[currentStepId];

  return (
    // `grow` would make the page at least 100vh high, which is taller than the viewport under
    // Kibana's fixed header, so the page would scroll even when the step is short.
    <EuiPageTemplate grow={false} data-test-subj="onboardingShell">
      <EuiPageTemplate.Section paddingSize="m" restrictWidth>
        {/* The title and the stepper stay at the top while the step scrolls underneath. The offset
            keeps them below Kibana's fixed header. */}
        <div
          css={css`
            position: sticky;
            top: var(--euiFixedHeadersOffset, 0);
            z-index: 2;
            padding-bottom: ${euiTheme.size.s};
            background-color: ${euiTheme.colors.backgroundBasePlain};
          `}
          data-test-subj="onboardingStickyHeader"
        >
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
        </div>
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
        ) : !awsServiceMatrix || !isDataFormatResolved ? (
          <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: '300px' }}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexGroup>
        ) : (
          CurrentStepComponent && <CurrentStepComponent onContinue={onContinue} onBack={onBack} />
        )}
      </EuiPageTemplate.Section>
      {isCancelModalOpen && (
        <EuiConfirmModal
          aria-labelledby={cancelModalTitleId}
          titleProps={{ id: cancelModalTitleId }}
          title={
            hasDeployment
              ? i18n.translate('xpack.ingestHub.onboardingShell.cancelModal.deployedTitle', {
                  defaultMessage: 'Leave onboarding?',
                })
              : i18n.translate('xpack.ingestHub.onboardingShell.cancelModal.title', {
                  defaultMessage: 'Cancel onboarding?',
                })
          }
          onCancel={() => setIsCancelModalOpen(false)}
          onConfirm={handleCancelFlow}
          cancelButtonText={i18n.translate(
            'xpack.ingestHub.onboardingShell.cancelModal.keepEditingButton',
            { defaultMessage: 'Keep editing' }
          )}
          confirmButtonText={
            hasDeployment
              ? i18n.translate('xpack.ingestHub.onboardingShell.cancelModal.leaveButton', {
                  defaultMessage: 'Leave onboarding',
                })
              : i18n.translate(
                  'xpack.ingestHub.onboardingShell.cancelModal.cancelOnboardingButton',
                  {
                    defaultMessage: 'Cancel onboarding',
                  }
                )
          }
          buttonColor={hasDeployment ? 'primary' : 'danger'}
          data-test-subj="onboardingCancelModal"
        >
          <p>
            {hasDeployment ? (
              <FormattedMessage
                id="xpack.ingestHub.onboardingShell.cancelModal.deployedBody"
                defaultMessage="Your deployed services stay in place. Changes you have not deployed will be lost."
              />
            ) : (
              <FormattedMessage
                id="xpack.ingestHub.onboardingShell.cancelModal.body"
                defaultMessage="Your changes will be lost if you cancel the flow."
              />
            )}
          </p>
        </EuiConfirmModal>
      )}
    </EuiPageTemplate>
  );
}
