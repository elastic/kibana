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
    initialValue: { mode: 'existing', workflowId: null },
  },
};

export const ExistingWorkflowSelected: Story = {
  args: {
    initialValue: { mode: 'existing', workflowId: 'singlestep-1' },
  },
};

export const CreateNewEmail: Story = {
  args: {
    initialValue: {
      mode: 'create',
      typeId: 'email',
      connectorId: null,
      params: 'to: ""\nsubject: ""\nmessage: ""\n',
    },
  },
};

export const CreateNewSlack: Story = {
  args: {
    initialValue: {
      mode: 'create',
      typeId: 'slack',
      connectorId: null,
      params: 'message: ""\n',
    },
  },
};

export const CreateNewFilled: Story = {
  args: {
    initialValue: {
      mode: 'create',
      typeId: 'email',
      connectorId: 'email-ops',
      params:
        'to: "{{ inputs.payload.policyId }}@example.com"\nsubject: "Alert for {{ inputs.payload.id }}"\nmessage: "{{ inputs.payload.episodes }} episodes"\n',
    },
  },
};
