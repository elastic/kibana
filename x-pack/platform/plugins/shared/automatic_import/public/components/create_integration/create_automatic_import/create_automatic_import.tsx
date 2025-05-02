/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useReducer, useMemo, useEffect, useCallback } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { Header } from './header';
import { Footer } from './footer';
import { CreateCelConfigFlyout } from './flyout/cel_configuration';
import { useNavigate, Page } from '../../../common/hooks/use_navigate';
import { ConnectorStep, isConnectorStepReadyToComplete } from './steps/connector_step';
import { IntegrationStep, isIntegrationStepReadyToComplete } from './steps/integration_step';
import { DataStreamStep, isDataStreamStepReadyToComplete } from './steps/data_stream_step';
import { ReviewStep, isReviewStepReadyToComplete } from './steps/review_step';
import { DeployStep } from './steps/deploy_step';
import { reducer, initialState, ActionsProvider, type Actions } from './state';
import { useTelemetry } from '../telemetry';

const stepNames: Record<number | string, string> = {
  1: 'Connector Step',
  2: 'Integration Step',
  3: 'DataStream Step',
  4: 'Review Step',
  5: 'Deploy Step',
};

export const CreateAutomaticImport = React.memo(() => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const navigate = useNavigate();

  const stepName = stepNames[state.step];

  const telemetry = useTelemetry();
  useEffect(() => {
    telemetry.reportAssistantOpen();
  }, [telemetry]);

  const isThisStepReadyToComplete = useMemo(() => {
    if (state.step === 1) {
      return isConnectorStepReadyToComplete(state);
    } else if (state.step === 2) {
      return isIntegrationStepReadyToComplete(state);
    } else if (state.step === 3) {
      return isDataStreamStepReadyToComplete(state);
    } else if (state.step === 4) {
      return isReviewStepReadyToComplete(state);
    }
    return false;
  }, [state]);

  const goBackStep = useCallback(() => {
    if (state.step === 1) {
      navigate(Page.landing);
    } else {
      dispatch({ type: 'SET_STEP', payload: state.step - 1 });
    }
  }, [navigate, dispatch, state.step]);

  const completeStep = useCallback(() => {
    if (!isThisStepReadyToComplete) {
      // If the user tries to navigate to the next step without completing the current step.
      return;
    }
    telemetry.reportAssistantStepComplete({ step: state.step, stepName });
    if (state.step === 3) {
      dispatch({ type: 'SET_IS_GENERATING', payload: true });
    } else {
      dispatch({ type: 'SET_STEP', payload: state.step + 1 });
    }
  }, [telemetry, state.step, stepName, isThisStepReadyToComplete]);

  const actions = useMemo<Actions>(
    () => ({
      setStep: (payload) => {
        dispatch({ type: 'SET_STEP', payload });
      },
      setConnector: (payload) => {
        dispatch({ type: 'SET_CONNECTOR', payload });
      },
      setIntegrationSettings: (payload) => {
        dispatch({ type: 'SET_INTEGRATION_SETTINGS', payload });
      },
      setIsGenerating: (payload) => {
        dispatch({ type: 'SET_IS_GENERATING', payload });
      },
      setShowCelCreateFlyout: (payload) => {
        dispatch({ type: 'SET_SHOW_CEL_CREATE_FLYOUT', payload });
      },
      setIsFlyoutGenerating: (payload) => {
        dispatch({ type: 'SET_IS_FLYOUT_GENERATING', payload });
      },
      setResult: (payload) => {
        dispatch({ type: 'SET_GENERATED_RESULT', payload });
      },
      setCelInputResult: (payload) => {
        dispatch({ type: 'SET_CEL_INPUT_RESULT', payload });
      },
      completeStep,
    }),
    [completeStep]
  );

  return (
    <ActionsProvider value={actions}>
      <KibanaPageTemplate>
        <Header currentStep={state.step} isGenerating={state.isGenerating} />
        <KibanaPageTemplate.Section grow paddingSize="l">
          {state.step === 1 && <ConnectorStep connector={state.connector} />}
          {state.step === 2 && <IntegrationStep integrationSettings={state.integrationSettings} />}
          {state.step === 3 && (
            <DataStreamStep
              integrationSettings={state.integrationSettings}
              celInputResult={state.celInputResult}
              connector={state.connector}
              isGenerating={state.isGenerating}
            />
          )}
          {state.step === 3 && state.showCelCreateFlyout && (
            <CreateCelConfigFlyout
              integrationSettings={state.integrationSettings}
              isFlyoutGenerating={state.isFlyoutGenerating}
              connector={state.connector}
            />
          )}
          {state.step === 4 && (
            <ReviewStep
              integrationSettings={state.integrationSettings}
              isGenerating={state.isGenerating}
              result={state.result}
            />
          )}
          {state.step === 5 && (
            <DeployStep
              integrationSettings={state.integrationSettings}
              result={state.result}
              celInputResult={state.celInputResult}
              connector={state.connector}
            />
          )}
        </KibanaPageTemplate.Section>
        <Footer
          isGenerating={state.isGenerating}
          isAnalyzeStep={state.step === 3}
          isLastStep={state.step === 5}
          isNextStepEnabled={isThisStepReadyToComplete && !state.isGenerating}
          isNextAddingToElastic={state.step === 4}
          onBack={goBackStep}
          onNext={completeStep}
        />
      </KibanaPageTemplate>
    </ActionsProvider>
  );
});
CreateAutomaticImport.displayName = 'CreateAutomaticImport';
