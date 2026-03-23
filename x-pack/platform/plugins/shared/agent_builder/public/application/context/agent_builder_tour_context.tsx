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
import { useKibana } from '../hooks/use_kibana';

export enum TourStep {
  AgentSelector = 'agent-selector',
  LlmSelector = 'llm-selector',
  ConversationsHistory = 'conversations-history',
  ConversationActions = 'conversation-actions',
}

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
  getStepProps: (step: TourStep) => TourStepProps;
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
  agentSelector: {
    title: i18n.translate('xpack.agentBuilder.agentBuilderTour.agentSelector.title', {
      defaultMessage: 'Meet your active agent 🕵️‍♂️',
    }),
    content: i18n.translate('xpack.agentBuilder.agentBuilderTour.agentSelector.content', {
      defaultMessage:
        "An agent's behavior is defined by its custom instructions and available tools. Switch agents when you need different capabilities for your tasks.",
    }),
  },
  llmSelector: {
    title: i18n.translate('xpack.agentBuilder.agentBuilderTour.llmSelector.title', {
      defaultMessage: 'Select your LLM 🧠',
    }),
    content: i18n.translate('xpack.agentBuilder.agentBuilderTour.llmSelector.content', {
      defaultMessage:
        'Your agent uses this model to generate responses. Switch LLMs to prioritize faster responses, lower costs, or more complex reasoning.',
    }),
  },
  // TODO: Add prompts step once we have prompts.
  // prompts: {
  //   title: i18n.translate('xpack.agentBuilder.agentBuilderTour.prompts.title', {
  //     defaultMessage: 'Reuse your prompts ✍️',
  //   }),
  //   content: i18n.translate('xpack.agentBuilder.agentBuilderTour.prompts.content', {
  //     defaultMessage: 'Store your favorite queries here. Pick one to drop it into the chat.',
  //   }),
  // },
  conversationsHistory: {
    title: i18n.translate('xpack.agentBuilder.agentBuilderTour.conversationsHistory.title', {
      defaultMessage: 'Browse your conversations 💬',
    }),
    content: i18n.translate('xpack.agentBuilder.agentBuilderTour.conversationsHistory.content', {
      defaultMessage: 'Find all your previous conversations here.',
    }),
  },
  conversationActions: {
    title: i18n.translate('xpack.agentBuilder.agentBuilderTour.conversationActions.title', {
      defaultMessage: 'Jump to key actions ⚙️',
    }),
    content: i18n.translate('xpack.agentBuilder.agentBuilderTour.conversationActions.content', {
      defaultMessage:
        'This menu is your hub for key management actions. You can quickly access important pages from here.',
    }),
  },
  closeTour: i18n.translate('xpack.agentBuilder.agentBuilderTour.closeTour', {
    defaultMessage: 'Close tour',
  }),
  next: i18n.translate('xpack.agentBuilder.agentBuilderTour.next', {
    defaultMessage: 'Next',
  }),
  finishTour: i18n.translate('xpack.agentBuilder.agentBuilderTour.finishTour', {
    defaultMessage: 'Finish tour',
  }),
};

interface TourStepConfig {
  step: number;
  title: string;
  content: React.ReactNode;
  footerActions: React.ReactNode[];
}

export const AgentBuilderTourProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const { isEmbeddedContext } = useConversationContext();
  const { notifications } = useKibana().services;
  const isTourEnabled = notifications.tours.isEnabled();

  const [currentStep, setCurrentStep] = useState(DEFAULT_STEP);

  const [isTourActive, setIsTourActive] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem(storageKeys.hasSeenAgentBuilderTour);
    let timer: NodeJS.Timeout | undefined;

    if (!isEmbeddedContext && !hasSeenTour && isTourEnabled) {
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
  }, [isEmbeddedContext, isTourEnabled]);

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

  const tourSteps: Record<TourStep, TourStepConfig> = {
    [TourStep.AgentSelector]: {
      title: labels.agentSelector.title,
      content: (
        <EuiText size="s">
          <p>{labels.agentSelector.content}</p>
        </EuiText>
      ),
      footerActions,
      step: 1,
    },
    [TourStep.LlmSelector]: {
      title: labels.llmSelector.title,
      content: (
        <EuiText size="s">
          <p>{labels.llmSelector.content}</p>
        </EuiText>
      ),
      footerActions,
      step: 2,
    },
    [TourStep.ConversationsHistory]: {
      title: labels.conversationsHistory.title,
      content: (
        <EuiText size="s">
          <p>{labels.conversationsHistory.content}</p>
        </EuiText>
      ),
      footerActions,
      step: 3,
    },
    [TourStep.ConversationActions]: {
      title: labels.conversationActions.title,
      content: (
        <EuiText size="s">
          <p>{labels.conversationActions.content}</p>
        </EuiText>
      ),
      footerActions: footerActionsFinish,
      step: 4,
    },
  };

  const getStepProps = (step: TourStep): TourStepProps => {
    const stepConfig = tourSteps[step];

    return {
      maxWidth: tourConfig.tourPopoverWidth,
      isStepOpen: currentStep === stepConfig.step && isTourActive,
      title: stepConfig.title,
      content: stepConfig.content,
      onFinish: handleFinishTour,
      step: stepConfig.step,
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
