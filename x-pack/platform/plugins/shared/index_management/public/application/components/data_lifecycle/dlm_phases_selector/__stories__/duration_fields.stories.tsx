/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { action } from '@storybook/addon-actions';
import { DurationFields } from '../components/duration_fields';
import { dlmPhasesSelectorStrings as strings } from '../strings';
import type { DlmPhaseDuration } from '../types';

interface DurationFieldsStoryArgs {
  label: string;
  phaseLabel: string;
  testSubjectPrefix: string;
  duration: DlmPhaseDuration;
}

const DurationFieldsStory = ({
  label,
  phaseLabel,
  testSubjectPrefix,
  duration: initialDuration,
}: DurationFieldsStoryArgs) => {
  const [duration, setDuration] = useState(initialDuration);

  const onChange = (nextDuration: DlmPhaseDuration) => {
    setDuration(nextDuration);
    action('onChange')(nextDuration);
  };

  return (
    <DurationFields
      label={label}
      phaseLabel={phaseLabel}
      testSubjectPrefix={testSubjectPrefix}
      duration={duration}
      onChange={onChange}
    />
  );
};

const meta: Meta<typeof DurationFieldsStory> = {
  component: DurationFieldsStory,
  title: 'DLM Phases Selector/Duration fields',
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 400 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    label: strings.moveAfterLabel,
    phaseLabel: strings.frozenPhaseLabel,
    testSubjectPrefix: 'frozen',
    duration: { enabled: true, value: '30', unit: 'd' },
  },
};

export default meta;

type Story = StoryObj<typeof DurationFieldsStory>;

export const Default: Story = {};

/** Simulates an API value using `ms`, which is not in the default unit dropdown. */
export const ApiMillisecondsUnit: Story = {
  name: 'API unit (milliseconds)',
  args: {
    duration: { enabled: true, value: '500', unit: 'ms' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const unitSelect = canvas.getByLabelText(
      strings.durationUnitAriaLabel(strings.frozenPhaseLabel)
    ) as HTMLSelectElement;

    expect(unitSelect).toHaveValue('ms');
    expect(unitSelect.options[unitSelect.selectedIndex].text).toBe('milliseconds');
  },
};
