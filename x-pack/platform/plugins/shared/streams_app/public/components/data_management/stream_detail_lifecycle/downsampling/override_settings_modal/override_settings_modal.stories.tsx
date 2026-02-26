/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { EuiOverlayMask } from '@elastic/eui';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { OverrideSettingsModal } from './override_settings_modal';

const meta: Meta<typeof OverrideSettingsModal> = {
  component: OverrideSettingsModal,
  title: 'streams/OverrideSettingsModal',
};

export default meta;
type Story = StoryObj<typeof OverrideSettingsModal>;

export const Default: Story = {
  render: () => {
    return (
      <EuiOverlayMask>
        <OverrideSettingsModal onCancel={action('onCancel')} onSave={action('onSave')} />
      </EuiOverlayMask>
    );
  },
};
