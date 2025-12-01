/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useState,
  useEffect,
  useRef,
} from 'react';
import { useEuiTour, EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type {
  EuiTourState,
  EuiTourActions,
  EuiTourStepProps,
  EuiStatelessTourSteps,
} from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { i18n } from '@kbn/i18n';
import { STREAMS_TOUR_CALLOUT_DISMISSED_KEY, STEP_ID_TO_TAB } from './constants';
import type { StreamsTourStepId } from './constants';
import { getTourStepsConfig, TourStepConfig } from './tour_steps_config';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';

export type StreamsTourStepProps = Omit<EuiTourStepProps, 'children' | 'anchor'> & {
  stepId: StreamsTourStepId;
};

function createEnhancedTourStepProps(
  baseProps: EuiTourStepProps[],
  stepsConfig: TourStepConfig[],
  actions: EuiTourActions,
  tourState: EuiTourState
): StreamsTourStepProps[] {
  const stepsTotal = stepsConfig.length;

  return baseProps.map((stepProps, index) => {
    const { anchor, children, ...rest } = stepProps as EuiTourStepProps & { anchor?: unknown };
    const stepConfig = stepsConfig[index];
    const isLastStep = stepProps.step === stepsTotal;
    const isCurrentStep = stepProps.step === tourState.currentTourStep;

    const footerAction = isLastStep ? (
      <EuiButton
        color="success"
        size="s"
        onClick={() => actions.finishTour()}
        data-test-subj="streamsTourStartExploringButton"
      >
        {i18n.translate('xpack.streams.tour.startExploringButton', {
          defaultMessage: 'Start exploring',
        })}
      </EuiButton>
    ) : (
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            color="text"
            onClick={() => actions.finishTour()}
            data-test-subj="streamsTourSkipButton"
          >
            {i18n.translate('xpack.streams.tour.skipButton', {
              defaultMessage: 'Skip tour',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="success"
            size="s"
            onClick={() => actions.incrementStep()}
            data-test-subj="streamsTourNextButton"
          >
            {i18n.translate('xpack.streams.tour.nextButton', {
              defaultMessage: 'Next',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    return {
      ...rest,
      stepId: stepConfig.stepId,
      isStepOpen: isCurrentStep && tourState.isTourActive,
      onFinish: () => actions.finishTour(),
      footerAction,
    };
  });
}

interface StreamsTourContextValue {
  tourStepProps: StreamsTourStepProps[];
  actions: EuiTourActions;
  tourState: EuiTourState;
  isCalloutDismissed: boolean;
  dismissCallout: () => void;
  startTour: (streamName?: string) => void;
  isTourAvailable: boolean;
  setTourAvailable: (available: boolean) => void;
  tourStreamName: string | null;
  setTourStreamName: (name: string | null) => void;
  getStepPropsByStepId: (stepId: StreamsTourStepId) => StreamsTourStepProps | undefined;
}

const StreamsTourContext = createContext<StreamsTourContextValue | null>(null);

const INITIAL_TOUR_STATE: EuiTourState = {
  currentTourStep: 1,
  isTourActive: false,
  tourPopoverWidth: 360,
  tourSubtitle: i18n.translate('xpack.streams.tour.subtitle', {
    defaultMessage: 'Streams',
  }),
};

interface StreamsTourProviderProps {
  children: React.ReactNode;
}

export function StreamsTourProvider({ children }: StreamsTourProviderProps) {
  const {
    core: {
      application: { navigateToApp },
    },
  } = useKibana();

  const { features } = useStreamsPrivileges();
  const attachmentsEnabled = features.attachments?.enabled ?? false;

  const [isCalloutDismissed = false, setCalloutDismissed] = useLocalStorage(
    STREAMS_TOUR_CALLOUT_DISMISSED_KEY,
    false
  );

  const [isTourAvailable, setTourAvailable] = useState(false);
  const [tourStreamName, setTourStreamName] = useState<string | null>(null);
  const prevStepRef = useRef<number>(1);

  const stepsConfig = useMemo(
    () => getTourStepsConfig({ attachmentsEnabled }),
    [attachmentsEnabled]
  );

  const [baseTourStepProps, actions, tourState] = useEuiTour(
    stepsConfig as unknown as EuiStatelessTourSteps,
    INITIAL_TOUR_STATE
  );

  const tourStepProps = useMemo(
    () => createEnhancedTourStepProps(baseTourStepProps, stepsConfig, actions, tourState),
    [baseTourStepProps, stepsConfig, actions, tourState]
  );

  const getStepPropsByStepId = useCallback(
    (stepId: StreamsTourStepId): StreamsTourStepProps | undefined => {
      return tourStepProps.find((props) => props.stepId === stepId);
    },
    [tourStepProps]
  );

  const dismissCallout = useCallback(() => {
    setCalloutDismissed(true);
  }, [setCalloutDismissed]);

  const startTour = useCallback(
    (streamName?: string) => {
      if (streamName) {
        setTourStreamName(streamName);
      }
      actions.resetTour();
    },
    [actions]
  );

  useEffect(() => {
    const currentStep = tourState.currentTourStep;
    const prevStep = prevStepRef.current;

    if (!tourState.isTourActive || currentStep === prevStep || !tourStreamName) {
      prevStepRef.current = currentStep;
      return;
    }

    const currentStepConfig = stepsConfig[currentStep - 1];
    if (!currentStepConfig) {
      prevStepRef.current = currentStep;
      return;
    }

    const tab = STEP_ID_TO_TAB[currentStepConfig.stepId];

    if (currentStepConfig.stepId === 'streams_list') {
      navigateToApp('streams', { path: '/', replace: false });
    } else if (tab) {
      navigateToApp('streams', {
        path: `/${tourStreamName}/management/${tab}`,
        replace: false,
      });
    }

    prevStepRef.current = currentStep;
  }, [tourState.currentTourStep, tourState.isTourActive, tourStreamName, navigateToApp, stepsConfig]);

  const value = useMemo<StreamsTourContextValue>(
    () => ({
      tourStepProps,
      actions,
      tourState,
      isCalloutDismissed: isCalloutDismissed ?? false,
      dismissCallout,
      startTour,
      isTourAvailable,
      setTourAvailable,
      tourStreamName,
      setTourStreamName,
      getStepPropsByStepId,
    }),
    [
      tourStepProps,
      actions,
      tourState,
      isCalloutDismissed,
      dismissCallout,
      startTour,
      isTourAvailable,
      setTourAvailable,
      tourStreamName,
      getStepPropsByStepId,
    ]
  );

  return <StreamsTourContext.Provider value={value}>{children}</StreamsTourContext.Provider>;
}

export function useStreamsTour(): StreamsTourContextValue {
  const context = useContext(StreamsTourContext);
  if (!context) {
    throw new Error('useStreamsTour must be used within StreamsTourProvider');
  }
  return context;
}
