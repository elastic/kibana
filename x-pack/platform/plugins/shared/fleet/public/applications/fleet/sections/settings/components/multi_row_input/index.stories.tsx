/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { MultiRowInput as Component } from '.';

interface Args {
  width: number;
  label: string;
  helpText: string;
  disabled: boolean;
  value?: string[];
  isUrl?: boolean;
}

const meta: Meta<typeof Component> = {
  component: Component,
  title: 'Sections/Fleet/Settings/MultiRowInput',
  parameters: {
    options: {
      enableShortcuts: false,
    },
  },
};

export default meta;
type Story = StoryObj<typeof Component>;

const HostsInputTemplate: Story['render'] = (args) => {
  const [value, setValue] = useState<string[]>(args.value || []);
  return (
    <div style={{ width: args.width || 350 }}>
      <Component
        id="test-host-input"
        helpText={args.helpText}
        value={value}
        onChange={setValue}
        label={args.label}
        disabled={args.disabled}
        isUrl={args.isUrl}
      />
    </div>
  );
};

export const HostsInput: Story = {
  render: HostsInputTemplate,
  args: {
    width: 250,
    label: 'Demo label',
    helpText: 'Demo helpText',
    disabled: false,
  },
};

export const HostsInputDisabled: Story = {
  render: (args) => (
    <div style={{ maxWidth: '350px' }}>
      <Component
        id="test-host-input"
        helpText={'Host input help text'}
        value={args.value}
        onChange={() => {}}
        label={'Host input label'}
        disabled={true}
      />
    </div>
  ),
  args: {
    value: ['http://test1.fr', 'http://test2.fr'],
  },
  argTypes: {
    value: {
      control: { type: 'object' },
    },
  },
};

export const HostsInputUrl: Story = {
  render: HostsInputTemplate,
  args: {
    width: 350,
    label: 'Host input label',
    helpText: 'Host input help text',
    disabled: false,
    value: ['https://test1.com', 'https://test2.com', 'https://test3.com'],
    isUrl: true,
  },
  argTypes: {
    value: {
      control: { type: 'object' },
    },
  },
};
