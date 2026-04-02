/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DurationInput } from './duration_input';

interface DurationInputStoryProps {
  initialValue: string;
  isInvalid?: boolean;
}

const DurationInputStory = ({ initialValue, isInvalid }: DurationInputStoryProps) => {
  const [value, setValue] = useState(initialValue);

  return <DurationInput value={value} onChange={setValue} isInvalid={isInvalid} />;
};

const meta: Meta<typeof DurationInputStory> = {
  title: 'Alerting V2/Notification Policy/Form/Duration Input',
  component: DurationInputStory,
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof DurationInputStory>;

export const Empty: Story = {
  args: { initialValue: '' },
};

export const FiveMinutes: Story = {
  args: { initialValue: '5m' },
};

export const OneHour: Story = {
  args: { initialValue: '1h' },
};

export const ThirtySeconds: Story = {
  args: { initialValue: '30s' },
};

export const Invalid: Story = {
  args: { initialValue: '5m', isInvalid: true },
};
