/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React, { useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { IlmPhaseSelectOption } from './ilm_phase_select';
import { IlmPhaseSelect } from './ilm_phase_select';

const meta: Meta<typeof IlmPhaseSelect> = {
  component: IlmPhaseSelect,
  title: 'streams/IlmPhaseSelect',
};

export default meta;
type Story = StoryObj<typeof IlmPhaseSelect>;

export const Default: Story = {
  render: () => {
    const Story = () => {
      const [selectedPhases, setSelectedPhases] = useState<IlmPhaseSelectOption[]>([]);
      return (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 140 }}>
          <EuiFlexItem grow={false}>
            <IlmPhaseSelect
              renderButton={(props) => (
                <EuiButton {...props} color="text" size="s" iconType="arrowDown" iconSide="right">
                  Add data phase and downsampling
                </EuiButton>
              )}
              selectedPhases={selectedPhases}
              onSelect={(phase) => {
                action('onSelect')(phase);
                setSelectedPhases((prev) => {
                  const next = [...prev, phase];
                  action('selectedPhases')(next);
                  return next;
                });
              }}
              initialIsOpen={true}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    };
    return <Story />;
  },
};
