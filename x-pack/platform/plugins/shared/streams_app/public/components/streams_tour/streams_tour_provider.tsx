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
import { STREAMS_TOUR_CALLOUT_DISMISSED_KEY, StreamsTourStep, TOUR_STEPS_TOTAL } from './constants';
import { getTourStepsConfig } from './tour_steps_config';
import { useKibana } from '../../hooks/use_kibana';

export type StreamsTourStepProps = Omit<EuiTourStepProps, 'children' | 'anchor'>;

function createEnhancedTourStepProps(
  baseProps: EuiTourStepProps[],
  actions: EuiTourActions,
  tourState: EuiTourState
): StreamsTourStepProps[] {
  return baseProps.map((stepProps) => {
    const { anchor, children, ...rest } = stepProps as EuiTourStepProps & { anchor?: unknown };
    const isLastStep = stepProps.step === TOUR_STEPS_TOTAL;
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
      isStepOpen: isCurrentStep && tourState.isTourActive,
      onFinish: () => actions.finishTour(),
      footerAction,
    };
  });
}

const STEP_TO_TAB: Record<number, string | undefined> = {
  [StreamsTourStep.RETENTION]: 'retention',
  [StreamsTourStep.PROCESSING]: 'processing',
  [StreamsTourStep.ADVANCED]: 'advanced',
};


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

  const [isCalloutDismissed = false, setCalloutDismissed] = useLocalStorage(
    STREAMS_TOUR_CALLOUT_DISMISSED_KEY,
    false
  );

  const [isTourAvailable, setTourAvailable] = useState(false);

  const [tourStreamName, setTourStreamName] = useState<string | null>(null);

  const prevStepRef = useRef<number>(1);

  const stepsConfig = useMemo(() => getTourStepsConfig(), []);

  const [baseTourStepProps, actions, tourState] = useEuiTour(
    stepsConfig as unknown as EuiStatelessTourSteps,
    INITIAL_TOUR_STATE
  );

  const tourStepProps = useMemo(
    () => createEnhancedTourStepProps(baseTourStepProps, actions, tourState),
    [baseTourStepProps, actions, tourState]
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

    const tab = STEP_TO_TAB[currentStep];

    if (currentStep === StreamsTourStep.STREAMS_LIST) {
      navigateToApp('streams', { path: '/', replace: false });
    } else if (tab) {
      navigateToApp('streams', {
        path: `/${tourStreamName}/management/${tab}`,
        replace: false,
      });
    }

    prevStepRef.current = currentStep;
  }, [tourState.currentTourStep, tourState.isTourActive, tourStreamName, navigateToApp]);

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

