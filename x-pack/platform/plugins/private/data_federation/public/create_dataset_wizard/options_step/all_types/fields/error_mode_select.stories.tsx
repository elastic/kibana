/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { useArgs } from '@storybook/preview-api';

import { fieldStoryDecorator } from '../../../__stories__/field_story_decorator';
import type { ComboBoxChange } from '../../../components/combo_box_selection_validity';
import type { DatasetErrorModeFormValue } from '../../../create_dataset_form_state';
import { ErrorModeSelect } from './error_mode_select';

type ErrorModeSelectProps = ComponentProps<typeof ErrorModeSelect>;

const meta: Meta<typeof ErrorModeSelect> = {
  component: ErrorModeSelect,
  title: 'data_federation/Fields/ErrorModeSelect',
  decorators: [fieldStoryDecorator],
  args: {
    value: '',
    onChange: action('onChange'),
    onBlur: action('onBlur'),
  },
  argTypes: {
    value: { control: 'select', options: ['', 'fail_fast', 'skip_row', 'null_field'] },
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs<ErrorModeSelectProps>();
    const onChange = (change: ComboBoxChange<DatasetErrorModeFormValue>) => {
      args.onChange(change);
      updateArgs({ value: change.value });
    };
    return <ErrorModeSelect {...args} onChange={onChange} />;
  },
};

export default meta;
type Story = StoryObj<typeof ErrorModeSelect>;

export const Empty: Story = {};

export const Selected: Story = {
  args: { value: 'skip_row' },
};
