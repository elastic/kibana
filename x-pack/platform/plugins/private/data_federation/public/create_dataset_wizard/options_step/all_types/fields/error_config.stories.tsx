/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { DatasetFormStoryProvider } from '../../../__stories__/dataset_form_story_provider';
import { fieldStoryDecorator } from '../../../__stories__/field_story_decorator';
import type { CreateDatasetSettingsFormValues } from '../../../create_dataset_form_state';
import { ErrorConfig } from './error_config';

type StoryArgs = Pick<
  CreateDatasetSettingsFormValues,
  'error_mode' | 'max_errors' | 'max_error_ratio'
>;

const meta: Meta<StoryArgs> = {
  title: 'data_federation/Fields/ErrorConfig',
  decorators: [fieldStoryDecorator],
  args: { error_mode: '', max_errors: '', max_error_ratio: '' },
  argTypes: {
    error_mode: { control: 'select', options: ['', 'fail_fast', 'skip_row', 'null_field'] },
  },
  render: (args) => (
    <DatasetFormStoryProvider settings={args}>
      {(control) => <ErrorConfig control={control} />}
    </DatasetFormStoryProvider>
  ),
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Empty: Story = {};

export const FailFast: Story = {
  args: { error_mode: 'fail_fast' },
};

export const SkipRowWithBudget: Story = {
  args: { error_mode: 'skip_row', max_errors: '100', max_error_ratio: '0.1' },
};

export const InvalidBudget: Story = {
  args: { error_mode: 'null_field', max_errors: '-1', max_error_ratio: '2' },
};
