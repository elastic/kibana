/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { AgentBuilderStorybookProvider } from '../../../../__storybook__/agent_builder_storybook_provider';
import { AskUserQuestionPrompt } from './ask_user_question_prompt';

const meta: Meta<typeof AskUserQuestionPrompt> = {
  title: 'HITL/Ask User Question Prompt',
  component: AskUserQuestionPrompt,
  // Disable auto-action detection to prevent double-logging alongside the explicit action below
  parameters: { actions: { argTypesRegex: '' } },
  args: { promptId: 'prompt-1', onSubmit: action('onSubmit') },
  decorators: [
    (Story) => (
      <AgentBuilderStorybookProvider conversationId="story-conversation-1">
        <div style={{ maxWidth: 600, padding: 24 }}>
          <Story />
        </div>
      </AgentBuilderStorybookProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof AskUserQuestionPrompt>;

export const SingleQuestion: Story = {
  args: {
    questions: [
      {
        question: 'Which environment are you investigating?',
        options: [{ label: 'Production' }, { label: 'Staging' }, { label: 'Development' }],
        multi_select: false,
      },
    ],
  },
};

export const MultiSelect: Story = {
  args: {
    questions: [
      {
        question: 'Which log levels should be included?',
        options: [
          { label: 'ERROR', description: 'Critical failures only' },
          { label: 'WARN', description: 'Warnings and errors' },
          { label: 'INFO', description: 'General operational messages' },
          { label: 'DEBUG', description: 'Verbose diagnostic output' },
        ],
        multi_select: true,
      },
    ],
  },
};

export const MultiQuestion: Story = {
  args: {
    questions: [
      {
        question: 'Which environment are you investigating?',
        options: [{ label: 'Production' }, { label: 'Staging' }],
        multi_select: false,
      },
      {
        question: 'What is the time range of interest?',
        options: [{ label: 'Last 15 minutes' }, { label: 'Last hour' }, { label: 'Last 24 hours' }],
        multi_select: false,
      },
      {
        question: 'Which services are affected?',
        options: [
          { label: 'checkout-api' },
          { label: 'inventory-service' },
          { label: 'payment-gateway' },
        ],
        multi_select: true,
      },
    ],
  },
};

export const Loading: Story = {
  args: {
    promptId: 'prompt-1',
    isLoading: true,
    questions: [
      {
        question: 'Which environment are you investigating?',
        options: [{ label: 'Production' }, { label: 'Staging' }],
        multi_select: false,
      },
    ],
  },
};

export const Disabled: Story = {
  args: {
    promptId: 'prompt-1',
    isDisabled: true,
    questions: [
      {
        question: 'Which environment are you investigating?',
        options: [{ label: 'Production' }, { label: 'Staging' }],
        multi_select: false,
      },
    ],
  },
};
