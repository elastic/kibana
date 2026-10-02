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
import { MaxErrorRatioField } from './max_error_ratio_field';

type StoryArgs = Pick<CreateDatasetSettingsFormValues, 'max_error_ratio'>;

const meta: Meta<StoryArgs> = {
  title: 'data_federation/Fields/MaxErrorRatioField',
  decorators: [fieldStoryDecorator],
  args: { max_error_ratio: '' },
  render: (args) => (
    <DatasetFormStoryProvider settings={args}>
      {(control) => <MaxErrorRatioField control={control} />}
    </DatasetFormStoryProvider>
  ),
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Empty: Story = {};

export const WithValue: Story = {
  args: { max_error_ratio: '0.1' },
};

export const Invalid: Story = {
  args: { max_error_ratio: '2' },
};
