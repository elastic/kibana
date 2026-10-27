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
import { MaxErrorsField } from './max_errors_field';

type StoryArgs = Pick<CreateDatasetSettingsFormValues, 'max_errors'>;

const meta: Meta<StoryArgs> = {
  title: 'data_federation/Fields/MaxErrorsField',
  decorators: [fieldStoryDecorator],
  args: { max_errors: '' },
  render: (args) => (
    <DatasetFormStoryProvider settings={args}>
      {(control) => <MaxErrorsField control={control} />}
    </DatasetFormStoryProvider>
  ),
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Empty: Story = {};

export const WithValue: Story = {
  args: { max_errors: '100' },
};

export const Invalid: Story = {
  args: { max_errors: '1.5' },
};
