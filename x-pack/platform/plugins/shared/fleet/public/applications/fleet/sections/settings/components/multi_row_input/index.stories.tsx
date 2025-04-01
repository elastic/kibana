/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from '@storybook/preview-api';
import type { StoryObj } from '@storybook/react';
import React from 'react';

import { MultiRowInput as Component } from '.';

export default {
  component: Component,
  title: 'Sections/Fleet/Settings/MultiRowInput',
  options: {
    enableShortcuts: false,
  },
} as StoryObj;

interface Args {
  width: number;
  label: string;
  helpText: string;
  disabled: boolean;
}

const args: Args = {
  width: 250,
  label: 'Demo label',
  helpText: 'Demo helpText',
  disabled: false,
};

const HostsInputComponent = ({ width, label, helpText, disabled }: Args) => {
  const [value, setValue] = useState<string[]>([]);
  return (
    <div style={{ width }}>
      <Component
        id="test-host-input"
        helpText={helpText}
        value={value}
        onChange={setValue}
        label={label}
        disabled={disabled}
      />
    </div>
  );
};

export const HostsInput = {
  render: (params: Args) => <HostsInputComponent {...params} />,

  args,
};

export const HostsInputDisabled = {
  render: ({ value }: { value: string[] }) => {
    return (
      <div style={{ maxWidth: '350px' }}>
        <Component
          id="test-host-input"
          helpText={'Host input help text'}
          value={value}
          onChange={() => {}}
          label={'Host input label'}
          disabled={true}
        />
      </div>
    );
  },

  args: { value: ['http://test1.fr', 'http://test2.fr'] },

  argTypes: {
    value: {
      control: { type: 'object' },
    },
  },
};

const HostsInputUrlComponent = () => {
  const [value, setValue] = useState<string[]>([]);
  return (
    <div style={{ maxWidth: '350px' }}>
      <Component
        id="test-host-input"
        helpText={'Host input help text'}
        value={value}
        onChange={setValue}
        label={'Host input label'}
        disabled={false}
        isUrl={true}
      />
    </div>
  );
};

export const HostsInputUrl = {
  render: () => <HostsInputUrlComponent />,

  args: { value: ['https://test1.com', 'https://test2.com', 'https://test3.com'] },

  argTypes: {
    value: {
      control: { type: 'object' },
    },
  },
};
