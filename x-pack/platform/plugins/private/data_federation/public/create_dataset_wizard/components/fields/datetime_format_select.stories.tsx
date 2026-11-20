/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import type { CreateDatasetSettingsFormValues } from '../../create_dataset_form_state';
import { DatasetFormStoryProvider } from '../../__stories__/dataset_form_story_provider';
import { fieldStoryDecorator } from '../../__stories__/field_story_decorator';
import { DatetimeFormatSelect } from './datetime_format_select';

type StoryArgs = Pick<CreateDatasetSettingsFormValues, 'datetime_format'>;

const meta: Meta<StoryArgs> = {
  title: 'data_federation/Fields/DatetimeFormatSelect',
  decorators: [fieldStoryDecorator],
  args: { datetime_format: '' },
  render: (args) => (
    <DatasetFormStoryProvider settings={args}>
      {(control) => <DatetimeFormatSelect control={control} />}
    </DatasetFormStoryProvider>
  ),
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Empty: Story = {};

export const PresetFormat: Story = {
  args: { datetime_format: 'yyyy-MM-dd HH:mm:ss' },
};

export const CustomFormat: Story = {
  args: { datetime_format: 'dd/MM/yyyy HH:mm' },
};
