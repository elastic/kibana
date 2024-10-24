/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiSpacer } from '@elastic/eui';
import type { ComponentStory } from '@storybook/react';
import React, { type ComponentProps, useState } from 'react';
import {
  MessageRole,
  type ObservabilityAIAssistantChatService,
} from '@kbn/observability-ai-assistant-plugin/public';
import { ChatState } from '@kbn/observability-ai-assistant-plugin/public';
import {
  buildAssistantMessage,
  buildFunctionResponseMessage,
  buildSystemMessage,
  buildUserMessage,
} from '../utils/builders';
import { ChatTimeline as Component, type ChatTimelineProps } from './chat_timeline';

export default {
  component: Component,
  title: 'app/Organisms/ChatTimeline',
  parameters: {
    backgrounds: {
      default: 'white',
      values: [{ name: 'white', value: '#fff' }],
    },
  },
  argTypes: {},
};

const Template: ComponentStory<typeof Component> = (props: ChatTimelineProps) => {
  const [count, setCount] = useState(props.messages.length - 1);

  return (
    <>
      <Component {...props} messages={props.messages.filter((_, index) => index <= count)} />

      <EuiSpacer />

      <EuiButton
        data-test-subj="observabilityAiAssistantTemplateAddMessageButton"
        onClick={() => setCount(count >= 0 && count < props.messages.length - 1 ? count + 1 : 0)}
      >
        Add message
      </EuiButton>
    </>
  );
};

const defaultProps: ComponentProps<typeof Component> = {
  knowledgeBase: {
    status: {
      loading: false,
      value: {
        ready: true,
        enabled: true,
      },
      refresh: () => {},
    },
    isInstalling: false,
    installError: undefined,
    install: async () => {},
  },
  chatService: {
    hasRenderFunction: () => false,
  } as unknown as ObservabilityAIAssistantChatService,
  chatState: ChatState.Ready,
  hasConnector: true,
  currentUser: {
    full_name: 'John Doe',
    username: 'johndoe',
  },
  messages: [
    buildSystemMessage(),
    buildUserMessage(),
    buildAssistantMessage(),
    buildUserMessage({ message: { content: 'How does it work?' } }),
    buildAssistantMessage({
      message: {
        content: `The way functions work depends on whether we are talking about mathematical functions or programming functions. Let's explore both:

        Mathematical Functions:
        In mathematics, a function maps input values to corresponding output values based on a specific rule or expression. The general process of how a mathematical function works can be summarized as follows:
        Step 1: Input - You provide an input value to the function, denoted as 'x' in the notation f(x). This value represents the independent variable.

        Step 2: Processing - The function takes the input value and applies a specific rule or algorithm to it. This rule is defined by the function itself and varies depending on the function's expression.

        Step 3: Output - After processing the input, the function produces an output value, denoted as 'f(x)' or 'y'. This output represents the dependent variable and is the result of applying the function's rule to the input.

        Step 4: Uniqueness - A well-defined mathematical function ensures that each input value corresponds to exactly one output value. In other words, the function should yield the same output for the same input whenever it is called.`,
      },
    }),
    buildUserMessage({
      message: { content: 'Can you execute a function?' },
    }),
    buildAssistantMessage({
      message: {
        content: 'Sure, I can do that.',
        function_call: {
          name: 'a_function',
          arguments: '{ "foo": "bar" }',
          trigger: MessageRole.Assistant,
        },
      },
    }),
    buildFunctionResponseMessage({
      message: { content: '{ "message": "The arguments are wrong" }' },
    }),
    buildAssistantMessage({
      message: {
        content: '',
        function_call: {
          name: 'a_function',
          arguments: '{ "bar": "foo" }',
          trigger: MessageRole.Assistant,
        },
      },
    }),
  ],
  onActionClick: async () => {},
  onEdit: async () => {},
  onFeedback: () => {},
  onRegenerate: () => {},
  onSendTelemetry: () => {},
  onStopGenerating: () => {},
};

export const ChatTimeline = Template.bind({});
ChatTimeline.args = defaultProps;
