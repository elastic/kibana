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
        stepType: 'slack',
        connectorId: null,
        params: 'message: ""\n',
      },
    ],
  },
};

export const SlackFilled: Story = {
  args: {
    initialValue: [
      {
        id: 's1',
        source: 'inline',
        stepType: 'slack',
        connectorId: 'slack-ops',
        params: 'message: "Alert for {{ inputs.policyId }}"\n',
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
        stepType: 'email',
        connectorId: 'email-ops',
        params: 'to: ""\nsubject: ""\nmessage: ""\n',
      },
      {
        id: 's1',
        source: 'inline',
        stepType: 'slack',
        connectorId: 'slack-ops',
        params: 'message: "Alert for {{ inputs.policyId }}"\n',
      },
      { id: 'w1', source: 'existing', workflowId: 'singlestep-1' },
    ],
  },
};
