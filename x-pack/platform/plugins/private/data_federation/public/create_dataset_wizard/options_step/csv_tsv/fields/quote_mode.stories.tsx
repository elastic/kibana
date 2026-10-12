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
import type { DatasetModeFormValue } from '../../../create_dataset_form_state';
import { QuoteMode } from './quote_mode';

type QuoteModeProps = ComponentProps<typeof QuoteMode>;

const MODE_OPTIONS: DatasetModeFormValue[] = ['', 'quoted', 'escaped', 'plain'];

const meta: Meta<typeof QuoteMode> = {
  component: QuoteMode,
  title: 'data_federation/Fields/QuoteMode',
  decorators: [fieldStoryDecorator],
  args: {
    value: '',
    defaultValue: 'quoted',
    onChange: action('onChange'),
    onBlur: action('onBlur'),
  },
  argTypes: {
    value: { control: 'select', options: MODE_OPTIONS },
    defaultValue: { control: 'select', options: MODE_OPTIONS },
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs<QuoteModeProps>();
    const onChange = (change: ComboBoxChange<DatasetModeFormValue>) => {
      args.onChange(change);
      updateArgs({ value: change.value });
    };
    return <QuoteMode {...args} onChange={onChange} />;
  },
};

export default meta;
type Story = StoryObj<typeof QuoteMode>;

export const CsvDefault: Story = {};

export const TsvDefault: Story = {
  args: { defaultValue: 'plain' },
};

export const Selected: Story = {
  args: { value: 'escaped' },
};
