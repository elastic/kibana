/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
  useEffect,
} from 'react';

import { EuiButton, EuiButtonEmpty, EuiText, type EuiTourStepProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PopoverAnchorPosition } from '@elastic/eui/src/components/popover/popover';
import { storageKeys } from '../storage_keys';
import { useConversationContext } from './conversation/conversation_context';

export type TourStepProps = Pick<
  EuiTourStepProps,
  | 'maxWidth'
  | 'isStepOpen'
  | 'title'
  | 'content'
  | 'onFinish'
  | 'step'
  | 'stepsTotal'
  | 'anchorPosition'
  | 'footerAction'
> & { anchor?: undefined };

interface AgentBuilderTourContextValue {
  isTourActive: boolean;
  getStepProps: (step: number) => TourStepProps | undefined;
}

const AgentBuilderTourContext = createContext<AgentBuilderTourContextValue | undefined>(undefined);

const DEFAULT_STEP = 1;
const TOUR_DELAY = 250; // 250ms

const tourConfig = {
  tourPopoverWidth: 370,
  anchorPosition: 'downCenter' as PopoverAnchorPosition,
  maxSteps: 4,
};

const labels = {
  step1: {
    title: i18n.translate('xpack.onechat.agentBuilderTour.step1', {
      defaultMessage: 'Meet your active agent 🕵️‍♂️',
    }),
    content: i18n.translate('xpack.onechat.agentBuilderTour.step1Content', {
      defaultMessage:
        'I’m here to help with your questions. Pick a different agent or customize a new one anytime.',
    }),
  },
  step2: {
    title: i18n.translate('xpack.onechat.agentBuilderTour.step2', {
      defaultMessage: 'You’re using this model 🧠',
    }),
    content: i18n.translate('xpack.onechat.agentBuilderTour.step2Content', {
      defaultMessage: 'I’ll answer using this LLM. Switch to another model you have setup.',
    }),
  },
  // TODO: Add step 3 once we have prompts.
  // step3: {
  //   title: i18n.translate('xpack.onechat.agentBuilderTour.step3', {
  //     defaultMessage: 'Reuse your prompts ✍️',
  //   }),
  //   content: i18n.translate('xpack.onechat.agentBuilderTour.step3Content', {
  //     defaultMessage: 'Store your favorite queries here. Pick one to drop it into the chat.',
  //   }),
  // },
  step3: {
    title: i18n.translate('xpack.onechat.agentBuilderTour.step3', {
      defaultMessage: 'Your conversations 💬',
    }),
    content: i18n.translate('xpack.onechat.agentBuilderTour.step3Content', {
      defaultMessage: 'Come back to earlier chats or jump between them from here.',
    }),
  },
  step4: {
    title: i18n.translate('xpack.onechat.agentBuilderTour.step4', {
      defaultMessage: 'Additional actions ⚙️',
    }),
    content: i18n.translate('xpack.onechat.agentBuilderTour.step4Content', {
      defaultMessage:
        'Access conversation actions, agent controls, and management settings from here.',
    }),
  },
  closeTour: i18n.translate('xpack.onechat.agentBuilderTour.closeTour', {
    defaultMessage: 'Close tour',
  }),
  next: i18n.translate('xpack.onechat.agentBuilderTour.next', {
    defaultMessage: 'Next',
  }),
  finishTour: i18n.translate('xpack.onechat.agentBuilderTour.finishTour', {
    defaultMessage: 'Finish tour',
  }),
};

interface TourStepConfig {
  title: string;
  content: React.ReactNode;
  footerActions: React.ReactNode[];
}

export const AgentBuilderTourProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const { isEmbeddedContext } = useConversationContext();

  const [currentStep, setCurrentStep] = useState(DEFAULT_STEP);

  const [isTourActive, setIsTourActive] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem(storageKeys.hasSeenAgentBuilderTour);
    let timer: NodeJS.Timeout | undefined;

    if (!isEmbeddedContext && !hasSeenTour) {
      // We use a delay to ensure the tour is not triggered immediately when the page loads to ensure correct anchor positioning.
      timer = setTimeout(() => {
        setIsTourActive(true);
      }, TOUR_DELAY);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isEmbeddedContext]);

  const handleMoveToNextStep = () => {
    setCurrentStep((prev) => prev + 1);
  };

  const handleFinishTour = () => {
    setIsTourActive(false);
    localStorage.setItem(storageKeys.hasSeenAgentBuilderTour, 'true');
  };

  const footerActions = [
    <EuiButtonEmpty size="s" color="text" onClick={handleFinishTour}>
      {labels.closeTour}
    </EuiButtonEmpty>,
    <EuiButton color="success" size="s" onClick={handleMoveToNextStep}>
      {labels.next}
    </EuiButton>,
  ];

  const footerActionsFinish = [
    <EuiButton color="success" size="s" onClick={handleFinishTour}>
      {labels.finishTour}
    </EuiButton>,
  ];

  const tourSteps: Record<number, TourStepConfig> = {
    1: {
      title: labels.step1.title,
      content: (
        <EuiText size="s">
          <p>{labels.step1.content}</p>
        </EuiText>
      ),
      footerActions,
    },
    2: {
      title: labels.step2.title,
      content: (
        <EuiText size="s">
          <p>{labels.step2.content}</p>
        </EuiText>
      ),
      footerActions,
    },
    3: {
      title: labels.step3.title,
      content: (
        <EuiText size="s">
          <p>{labels.step3.content}</p>
        </EuiText>
      ),
      footerActions,
    },
    4: {
      title: labels.step4.title,
      content: (
        <EuiText size="s">
          <p>{labels.step4.content}</p>
        </EuiText>
      ),
      footerActions: footerActionsFinish,
    },
  };

  const getStepProps = (step: number): TourStepProps | undefined => {
    const stepConfig = tourSteps[step];
    if (!stepConfig) return undefined;

    return {
      maxWidth: tourConfig.tourPopoverWidth,
      isStepOpen: currentStep === step && isTourActive,
      title: stepConfig.title,
      content: stepConfig.content,
      onFinish: handleFinishTour,
      step,
      stepsTotal: tourConfig.maxSteps,
      anchorPosition: tourConfig.anchorPosition,
      footerAction: stepConfig.footerActions,
    };
  };

  const contextValue: AgentBuilderTourContextValue = {
    isTourActive,
    getStepProps,
  };

  return (
    <AgentBuilderTourContext.Provider value={contextValue}>
      {children}
    </AgentBuilderTourContext.Provider>
  );
};

export const useAgentBuilderTour = (): AgentBuilderTourContextValue => {
  const context = useContext(AgentBuilderTourContext);
  if (!context) {
    throw new Error('useAgentBuilderTour must be used within an AgentBuilderTourProvider');
  }
  return context;
};
