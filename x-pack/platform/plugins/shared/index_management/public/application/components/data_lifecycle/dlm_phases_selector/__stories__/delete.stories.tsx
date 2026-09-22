/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DeletePhaseCard } from '../components/delete_phase_card';
import type { DlmPhaseDuration } from '../types';

const DeleteCard = (args: { isCardDisabled: boolean }) => {
  const [duration, setDuration] = useState<DlmPhaseDuration>({
    enabled: true,
    value: '90',
    unit: 'd',
  });

  return (
    <DeletePhaseCard
      id="storybookDeletePhase"
      duration={duration}
      isCardDisabled={args.isCardDisabled}
      durationError={undefined}
      helpText={undefined}
      isFormDisabled={false}
      onChange={setDuration}
    />
  );
};

const meta: Meta<typeof DeleteCard> = {
  component: DeleteCard,
  title: 'DLM Phases Selector/Cards/Delete',
  args: {
    isCardDisabled: false,
  },
};

export default meta;

type Story = StoryObj<typeof DeleteCard>;

export const Card: Story = {};

export const CardDisabled: Story = {
  args: {
    isCardDisabled: true,
  },
};
