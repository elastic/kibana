/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { userEvent } from '@storybook/test';

import type { CreateDatasetSettingsFormValues } from '../../create_dataset_form_state';
import { DatasetFormStoryProvider } from '../../__stories__/dataset_form_story_provider';
import { fieldStoryDecorator } from '../../__stories__/field_story_decorator';
import { SchemaResolutionField } from './schema_resolution_field';

type StoryArgs = Pick<CreateDatasetSettingsFormValues, 'schema_resolution'> & {
  isDisabled: boolean;
};

const TOGGLE_TEST_SUBJ = 'createDatasetWizardSchemaResolutionToggle';

const meta: Meta<StoryArgs> = {
  title: 'data_federation/Fields/SchemaResolutionField',
  decorators: [fieldStoryDecorator],
  args: { schema_resolution: '', isDisabled: false },
  argTypes: {
    schema_resolution: {
      control: 'select',
      options: ['', 'first_file_wins', 'strict', 'union_by_name'],
    },
  },
  render: ({ isDisabled, ...settings }) => (
    <DatasetFormStoryProvider settings={settings}>
      {() => <SchemaResolutionField isDisabled={isDisabled} />}
    </DatasetFormStoryProvider>
  ),
};

export default meta;
type Story = StoryObj<StoryArgs>;

const expandField: Story['play'] = async ({ canvasElement }) => {
  const toggle = canvasElement.querySelector<HTMLElement>(`[data-test-subj="${TOGGLE_TEST_SUBJ}"]`);
  if (toggle) {
    await userEvent.click(toggle);
  }
};

export const Collapsed: Story = {};

export const Expanded: Story = {
  play: expandField,
};

export const ExpandedWithSelection: Story = {
  args: { schema_resolution: 'union_by_name' },
  play: expandField,
};

export const ExpandedDisabled: Story = {
  args: { isDisabled: true },
  play: expandField,
};
