/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * The knowledge base tour for 8.14
 *
 * */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiButton, EuiButtonEmpty, EuiTourStep, EuiTourStepProps } from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { KNOWLEDGE_BASE_TAB } from '../../assistant/settings/const';
import { useAssistantContext } from '../../..';
import { VideoToast } from './video_toast';
import { NEW_FEATURES_TOUR_STORAGE_KEYS } from '../const';
import { knowledgeBaseTourStepOne, tourConfig } from './step_config';
import * as i18n from './translations';

export interface TourState {
  currentTourStep: number;
  isTourActive: boolean;
}
const KnowledgeBaseTourComp: React.FC<{
  children?: EuiTourStepProps['children'];
  isKbSettingsPage?: boolean;
}> = ({ children, isKbSettingsPage = false }) => {
  const { navigateToApp } = useAssistantContext();

  const [tourState, setTourState] = useLocalStorage<TourState>(
    NEW_FEATURES_TOUR_STORAGE_KEYS.KNOWLEDGE_BASE,
    tourConfig
  );

  const advanceToVideoStep = useCallback(
    () =>
      setTourState((prev = tourConfig) => ({
        ...prev,
        currentTourStep: 2,
      })),
    [setTourState]
  );

  useEffect(() => {
    if (tourState?.isTourActive && isKbSettingsPage) {
      advanceToVideoStep();
    }
  }, [advanceToVideoStep, isKbSettingsPage, tourState?.isTourActive]);

  const finishTour = useCallback(
    () =>
      setTourState((prev = tourConfig) => ({
        ...prev,
        isTourActive: false,
      })),
    [setTourState]
  );

  const navigateToKnowledgeBase = useCallback(
    () =>
      navigateToApp('management', {
        path: `kibana/securityAiAssistantManagement?tab=${KNOWLEDGE_BASE_TAB}`,
      }),
    [navigateToApp]
  );

  const nextStep = useCallback(() => {
    if (tourState?.currentTourStep === 1) {
      navigateToKnowledgeBase();
      advanceToVideoStep();
    }
  }, [tourState?.currentTourStep, navigateToKnowledgeBase, advanceToVideoStep]);

  const footerAction = useMemo(
    () => [
      // if exit, set tour to the video step without navigating to the page
      <EuiButtonEmpty size="s" color="text" onClick={advanceToVideoStep}>
        {i18n.KNOWLEDGE_BASE_TOUR_EXIT}
      </EuiButtonEmpty>,
      // if next, set tour to the video step and navigate to the page
      <EuiButton color="success" size="s" onClick={nextStep}>
        {i18n.KNOWLEDGE_BASE_TRY_IT}
      </EuiButton>,
    ],
    [advanceToVideoStep, nextStep]
  );

  const isTestAutomation =
    // @ts-ignore
    window.Cypress != null || // TODO: temporary workaround to disable the tour when running in Cypress, because the tour breaks other projects Cypress tests
    navigator.webdriver === true; // TODO: temporary workaround to disable the tour when running in the FTR, because the tour breaks other projects FTR tests

  const [isTimerExhausted, setIsTimerExhausted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTimerExhausted(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isTestAutomation || !tourState?.isTourActive) {
    return children ?? null;
  }

  return tourState?.currentTourStep === 1 && children ? (
    <EuiTourStep
      anchorPosition={'downRight'}
      content={knowledgeBaseTourStepOne.content}
      footerAction={footerAction}
      isStepOpen={isTimerExhausted}
      maxWidth={450}
      onFinish={advanceToVideoStep}
      panelProps={{
        'data-test-subj': `knowledgeBase-tour-step-1`,
      }}
      step={1}
      stepsTotal={1}
      title={knowledgeBaseTourStepOne.title}
    >
      {children}
    </EuiTourStep>
  ) : isKbSettingsPage ? (
    <VideoToast onClose={finishTour} />
  ) : (
    children ?? null
  );
};

export const KnowledgeBaseTour = React.memo(KnowledgeBaseTourComp);
