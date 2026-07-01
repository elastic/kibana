/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { usePhaseColors } from '@kbn/data-lifecycle-phases';
import { HotPhaseCard } from '../components/hot_phase_card';

const HotCard = () => {
  const phaseColors = usePhaseColors();
  return <HotPhaseCard id="storybookHotPhase" color={phaseColors.hot} />;
};

const meta: Meta<typeof HotCard> = {
  component: HotCard,
  title: 'DLM Phases Selector/Cards/Hot',
};

export default meta;

type Story = StoryObj<typeof HotCard>;

export const Card: Story = {
  render: () => <HotCard />,
};
