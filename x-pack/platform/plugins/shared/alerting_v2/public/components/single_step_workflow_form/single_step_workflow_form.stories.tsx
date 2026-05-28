/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { SingleStepWorkflowForm } from './single_step_workflow_form';
import type { SingleStepWorkflowFormValue } from './types';

interface StoryProps {
  initialValue: SingleStepWorkflowFormValue;
}

const SingleStepWorkflowFormStory = ({ initialValue }: StoryProps) => {
  const [value, setValue] = useState<SingleStepWorkflowFormValue>(initialValue);

  return <SingleStepWorkflowForm value={value} onChange={setValue} />;
};

const meta: Meta<typeof SingleStepWorkflowFormStory> = {
  title: 'Alerting V2/Single Step Workflow/Form',
  component: SingleStepWorkflowFormStory,
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof SingleStepWorkflowFormStory>;

export const Empty: Story = {
  args: {
    initialValue: [],
  },
};

export const WorkflowItem: Story = {
  args: {
    initialValue: [{ id: 'w1', kind: 'workflow', workflowId: 'singlestep-1' }],
  },
};

export const SlackEmpty: Story = {
  args: {
    initialValue: [
      {
        id: 's1',
        kind: 'slack',
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
        kind: 'slack',
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
        kind: 'email',
        connectorId: 'email-ops',
        params: 'to: ""\nsubject: ""\nmessage: ""\n',
      },
      {
        id: 's1',
        kind: 'slack',
        connectorId: 'slack-ops',
        params: 'message: "Alert for {{ inputs.policyId }}"\n',
      },
      { id: 'w1', kind: 'workflow', workflowId: 'singlestep-1' },
    ],
  },
};
