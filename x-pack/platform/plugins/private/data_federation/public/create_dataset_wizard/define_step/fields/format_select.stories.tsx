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

import { fieldStoryDecorator } from '../../__stories__/field_story_decorator';
import type { DatasetFormatFormValue } from '../../create_dataset_form_state';
import { FormatSelect, SUPPORTED_DATASET_FORMATS } from './format_select';

type FormatSelectProps = ComponentProps<typeof FormatSelect>;

const meta: Meta<typeof FormatSelect> = {
  component: FormatSelect,
  title: 'data_federation/Fields/FormatSelect',
  decorators: [fieldStoryDecorator],
  args: {
    value: '',
    isInvalid: false,
    isAutoDetected: false,
    onChange: action('onChange'),
    onBlur: action('onBlur'),
  },
  argTypes: {
    value: { control: 'select', options: ['', ...SUPPORTED_DATASET_FORMATS] },
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs<FormatSelectProps>();
    const onChange = (value: DatasetFormatFormValue) => {
      args.onChange(value);
      updateArgs({ value, isAutoDetected: false });
    };
    return <FormatSelect {...args} onChange={onChange} />;
  },
};

export default meta;
type Story = StoryObj<typeof FormatSelect>;

export const Empty: Story = {};

export const Selected: Story = {
  args: { value: 'csv' },
};

export const AutoDetected: Story = {
  args: { value: 'parquet', isAutoDetected: true },
};

export const Invalid: Story = {
  args: { isInvalid: true },
};
