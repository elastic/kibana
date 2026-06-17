/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { usePhaseColors } from '@kbn/data-lifecycle-phases';
import { FrozenPhaseCard, type FrozenDisabledReason } from '../components/frozen_phase_card';
import type { DlmPhaseDuration } from '../types';

const FrozenCard = (args: { disabled: boolean; disabledReason?: FrozenDisabledReason }) => {
  const phaseColors = usePhaseColors();
  const [duration, setDuration] = useState<DlmPhaseDuration>({
    enabled: true,
    value: '30',
    unit: 'd',
  });

  return (
    <FrozenPhaseCard
      id="storybookFrozenPhase"
      color={phaseColors.frozen}
      duration={duration}
      disabled={args.disabled}
      disabledReason={args.disabledReason}
      durationError={undefined}
      helpText={undefined}
      isFormDisabled={false}
      defaultSnapshotRepository="found-snapshots"
      manageRepositoriesHref="/app/management/data/snapshot_restore/repositories"
      onChange={setDuration}
    />
  );
};

const meta: Meta<typeof FrozenCard> = {
  component: FrozenCard,
  title: 'DLM Phases Selector/Cards/Frozen',
  args: {
    disabled: false,
  },
};

export default meta;

type Story = StoryObj<typeof FrozenCard>;

export const Card: Story = {};

export const CardEnterpriseRequired: Story = {
  args: {
    disabled: true,
    disabledReason: {
      type: 'enterprise',
      onClick: action('onOpenSubscriptionUpgradeModal'),
    },
  },
};

export const CardDefaultRepositoryRequired: Story = {
  args: {
    disabled: true,
    disabledReason: {
      type: 'defaultRepository',
      onClick: action('onOpenCreateDefaultRepositoryModal'),
    },
  },
};
