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
import { PartitionDetectionSelect } from './partition_detection_select';

type StoryArgs = Pick<CreateDatasetSettingsFormValues, 'partition_detection'>;

const meta: Meta<StoryArgs> = {
  title: 'data_federation/Fields/PartitionDetectionSelect',
  decorators: [fieldStoryDecorator],
  args: { partition_detection: '' },
  argTypes: {
    partition_detection: { control: 'select', options: ['', 'auto', 'hive', 'template', 'none'] },
  },
  render: (args) => (
    <DatasetFormStoryProvider settings={args}>
      {(control) => <PartitionDetectionSelect control={control} />}
    </DatasetFormStoryProvider>
  ),
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Empty: Story = {};

export const Selected: Story = {
  args: { partition_detection: 'hive' },
};
