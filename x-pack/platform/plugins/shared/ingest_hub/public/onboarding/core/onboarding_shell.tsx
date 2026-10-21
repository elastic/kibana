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

// The page content is a column, so the step can be stretched to the height of the page and its
// footer pushed to the bottom. EuiFlexGroup grows by default, which would spread any free space
// between the sections of the page, so only the step container is allowed to grow.
const stepLayoutCss = css`
  display: flex;
  flex-direction: column;
  flex-grow: 1;

  > * {
    flex-grow: 0;
  }

  > [data-test-subj='onboardingStepContainer'] {
    flex-grow: 1;
  }
`;

// Every step renders one root element with a `onboardingStep-*` test subject. It fills the
// container, and its children keep their natural height so that the free space ends up between
// the content and the footer (see StepFooter).
const stepFillCss = css`
  display: flex;
  flex-direction: column;

  > [data-test-subj^='onboardingStep-'] {
    display: flex;
    flex-direction: column;
    flex-grow: 1;

    > * {
      flex-grow: 0;
    }
  }
`;

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
    <EuiPageTemplate data-test-subj="onboardingShell">
      {/* The content is a column that fills the page, so the step's footer can sit at the bottom
          even when the step is short (see StepFooter). */}
      <EuiPageTemplate.Section
        grow
        paddingSize="m"
        restrictWidth
        contentProps={{ css: stepLayoutCss }}
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
          CurrentStepComponent && (
            <div css={stepFillCss} data-test-subj="onboardingStepContainer">
              <CurrentStepComponent onContinue={onContinue} onBack={onBack} />
            </div>
          )
        )}
      </EuiPageTemplate.Section>
      {isCancelModalOpen && (
        <EuiConfirmModal
          aria-labelledby={cancelModalTitleId}
          titleProps={{ id: cancelModalTitleId }}
          title={i18n.translate('xpack.ingestHub.onboardingShell.cancelModal.title', {
            defaultMessage: 'Cancel onboarding?',
          })}
          onCancel={() => setIsCancelModalOpen(false)}
          onConfirm={handleCancelFlow}
          cancelButtonText={i18n.translate(
            'xpack.ingestHub.onboardingShell.cancelModal.keepEditingButton',
            { defaultMessage: 'Keep editing' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.ingestHub.onboardingShell.cancelModal.cancelOnboardingButton',
            { defaultMessage: 'Cancel onboarding' }
          )}
          buttonColor="danger"
          data-test-subj="onboardingCancelModal"
        >
          <p>
            <FormattedMessage
              id="xpack.ingestHub.onboardingShell.cancelModal.body"
              defaultMessage="Your changes will be lost if you cancel the flow."
            />
          </p>
        </EuiConfirmModal>
      )}
    </EuiPageTemplate>
  );
}
