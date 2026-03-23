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

import { buildStreamName, countWildcards, type ValidationErrorType } from '../../utils';
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
  validationError,
}: {
  indexPattern: string;
  validationError?: ValidationErrorType;
}) => {
  const wildcardCount = countWildcards(indexPattern);
  const [parts, setParts] = useState<string[]>(() => Array(wildcardCount).fill(''));

  // Derive stream name from parts
  const streamName = buildStreamName(indexPattern, parts);

  return (
    <>
      <EuiFormRow
        label="Stream name"
        helpText="Name your classic stream by filling in the wildcard (*) portions of the index pattern."
        fullWidth
        isInvalid={validationError !== null && validationError !== undefined}
      >
        <StreamNameInput
          indexPattern={indexPattern}
          parts={parts}
          onPartsChange={(newParts) => {
            setParts(newParts);
            action('onPartsChange')(newParts);
          }}
          validationError={validationError}
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
    validationError: null,
  },
  argTypes: {
    indexPattern: {
      control: 'text',
    },
    validationError: {
      control: 'select',
      options: ['empty', 'duplicate', 'higherPriority', null],
    },
  },
  render: (args) => (
    <StreamNameInputWithPreview
      key={args.indexPattern}
      indexPattern={args.indexPattern ?? '*-logs-*-*'}
      validationError={args.validationError}
    />
  ),
};

/**
 * No wildcards - the index pattern is read-only
 */
export const NoWildcards: Story = {
  render: () => <StreamNameInputWithPreview indexPattern="logs-apache.access" />,
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
 * Empty validation error - only empty inputs are highlighted.
 * Fill in some inputs and leave others empty to see the difference.
 */
export const EmptyValidationError: Story = {
  render: () => (
    <StreamNameInputWithPreview indexPattern="*-logs-*-data-*" validationError="empty" />
  ),
};

/**
 * Duplicate validation error - all inputs are highlighted
 */
export const DuplicateValidationError: Story = {
  render: () => (
    <StreamNameInputWithPreview indexPattern="logs-*-data-*" validationError="duplicate" />
  ),
};

/**
 * Higher priority validation error - all inputs are highlighted
 */
export const HigherPriorityValidationError: Story = {
  render: () => (
    <StreamNameInputWithPreview indexPattern="logs-*-data-*" validationError="higherPriority" />
  ),
};
