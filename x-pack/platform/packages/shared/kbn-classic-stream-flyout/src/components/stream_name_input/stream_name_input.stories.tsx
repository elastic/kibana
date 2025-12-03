/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiFormRow, EuiPanel, EuiSpacer, EuiText, EuiCode } from '@elastic/eui';

import { StreamNameInput } from './stream_name_input';

const meta: Meta<typeof StreamNameInput> = {
  component: StreamNameInput,
  title: 'Stream Name Input',
  decorators: [
    (Story) => (
      <EuiPanel style={{ maxWidth: 640 }}>
        <Story />
      </EuiPanel>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StreamNameInput>;

/**
 * Wrapper component that shows the generated stream name
 */
const StreamNameInputWithPreview = ({
  indexPattern,
  isInvalid,
}: {
  indexPattern: string;
  isInvalid?: boolean;
}) => {
  const [streamName, setStreamName] = useState('');

  return (
    <>
      <EuiFormRow
        label="Stream name"
        helpText="Name your classic stream by filling in the wildcard (*) portions of the index pattern."
        fullWidth
        isInvalid={isInvalid}
      >
        <StreamNameInput
          indexPattern={indexPattern}
          onChange={(name) => {
            setStreamName(name);
            action('onChange')(name);
          }}
          isInvalid={isInvalid}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiText size="s">
        <strong>Generated stream name:</strong> <EuiCode>{streamName || '(empty)'}</EuiCode>
      </EuiText>
    </>
  );
};

/**
 * Default story with interactive controls
 */
export const Default: Story = {
  args: {
    indexPattern: '*-logs-*-*',
    isInvalid: false,
  },
  argTypes: {
    indexPattern: {
      control: 'text',
      description: 'Index pattern with wildcards (*)',
    },
    isInvalid: {
      control: 'boolean',
      description: 'Whether the input is in an invalid state',
    },
  },
  render: (args) => (
    <StreamNameInputWithPreview
      indexPattern={args.indexPattern ?? '*-logs-*-*'}
      isInvalid={args.isInvalid}
    />
  ),
};

/**
 * Single wildcard at the end - the most common pattern
 */
export const SingleWildcard: Story = {
  render: () => <StreamNameInputWithPreview indexPattern="logs-apache.access-*" />,
};

/**
 * Multiple wildcards - shows connected input group
 */
export const MultipleWildcards: Story = {
  render: () => <StreamNameInputWithPreview indexPattern="*-logs-*-*" />,
};

/**
 * Pattern with many wildcards (5+) - tests wrapping behavior
 */
export const ManyWildcards: Story = {
  render: () => <StreamNameInputWithPreview indexPattern="*-logs-*-data-*-region-*-env-*" />,
};

/**
 * Pattern with long static text - tests that labels don't truncate
 */
export const LongStaticSegments: Story = {
  render: () => (
    <StreamNameInputWithPreview indexPattern="*-reallllllllllllllllllly-*-loooooooooooong-*-index-*-name-*" />
  ),
};

/**
 * Invalid state - shows error styling on inputs
 */
export const InvalidState: Story = {
  render: () => <StreamNameInputWithPreview indexPattern="logs-*-data-*" isInvalid />,
};
