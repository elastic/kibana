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
import {
  DEFAULT_FILE_EXCLUSIONS,
  type CreateDatasetSettingsFormValues,
} from '../../../create_dataset_form_state';
import { FileExclusionsSelect } from './file_exclusions_select';

type StoryArgs = Pick<CreateDatasetSettingsFormValues, 'file_exclusions'>;

const meta: Meta<StoryArgs> = {
  title: 'data_federation/Fields/FileExclusionsSelect',
  decorators: [fieldStoryDecorator],
  args: { file_exclusions: [] },
  render: (args) => (
    <DatasetFormStoryProvider settings={args}>
      {(control) => <FileExclusionsSelect control={control} />}
    </DatasetFormStoryProvider>
  ),
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Empty: Story = {};

export const DefaultExclusions: Story = {
  args: { file_exclusions: [...DEFAULT_FILE_EXCLUSIONS] },
};
