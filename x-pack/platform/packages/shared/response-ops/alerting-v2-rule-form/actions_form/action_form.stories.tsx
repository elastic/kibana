/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { ActionForm } from './action_form';
import type { ActionFormValue } from './types';

interface StoryProps {
  initialValue: ActionFormValue;
}

const ActionFormStory = ({ initialValue }: StoryProps) => {
  const [value, setValue] = useState<ActionFormValue>(initialValue);

  return <ActionForm value={value} onChange={setValue} />;
};

const meta: Meta<typeof ActionFormStory> = {
  title: 'Alerting V2/Action Form/Form',
  component: ActionFormStory,
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof ActionFormStory>;

export const Empty: Story = {
  args: {
    initialValue: [],
  },
};

export const ExistingWorkflow: Story = {
  args: {
    initialValue: [{ id: 'w1', source: 'existing', workflowId: 'singlestep-1' }],
  },
};

export const SlackEmpty: Story = {
  args: {
    initialValue: [
      {
      id: 's1',
      source: 'inline',
      workflowName: 'Slack notification',
      steps: [
        {
          id: 's1-step',
          stepType: 'slack2.sendMessage',
          stepName: 'notify',
          connectorId: null,
          params: 'channel: "myChannel"\ntext: "Alert for {{ inputs.policyId }}"\n',
        },
      ],
    },
    ],
  },
};

export const SlackFilled: Story = {
  args: {
    initialValue: [
      {
      id: 's2',
      source: 'inline',
      workflowName: 'Slack notification',
      steps: [
        {
          id: 's2-step',
          stepType: 'slack2.sendMessage',
          stepName: 'notify',
          connectorId: 'slack2-ops',
          params: 'channel: "myChannel"\ntext: "Alert for {{ inputs.policyId }}"\n',
        },
      ],
    },
    ],
  },
};

export const MultipleActions: Story = {
  args: {
    initialValue: [
      {
      id: 'e1',
      source: 'inline',
      workflowName: 'Email notification',
      steps: [
        {
          id: 'e1-step',
          stepType: 'email',
          stepName: 'notify',
          connectorId: 'email-ops',
          params: 'to: ""\nsubject: ""\nmessage: ""\n',
        },
      ],
    },
      {
      id: 's1',
      source: 'inline',
      workflowName: 'Slack notification',
      steps: [
        {
          id: 's1-step',
          stepType: 'slack2.sendMessage',
          stepName: 'notify',
          connectorId: 'slack-ops',
          params: 'channel: "myChannel"\ntext: "Alert for {{ inputs.policyId }}"\n',
        },
      ],
    },
      { id: 'w1', source: 'existing', workflowId: 'singlestep-1' },
    ],
  },
};
