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
import type { DatasetBooleanFormValue } from '../../../create_dataset_form_state';
import { HeaderRow } from './header_row';

type HeaderRowProps = ComponentProps<typeof HeaderRow>;

const meta: Meta<typeof HeaderRow> = {
  component: HeaderRow,
  title: 'data_federation/Fields/HeaderRow',
  decorators: [fieldStoryDecorator],
  args: {
    value: '',
    onChange: action('onChange'),
    onBlur: action('onBlur'),
  },
  argTypes: {
    value: { control: 'select', options: ['', 'true', 'false'] },
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs<HeaderRowProps>();
    const onChange = (value: DatasetBooleanFormValue) => {
      args.onChange(value);
      updateArgs({ value });
    };
    return <HeaderRow {...args} onChange={onChange} />;
  },
};

export default meta;
type Story = StoryObj<typeof HeaderRow>;

export const Empty: Story = {};

export const HasHeaderRow: Story = {
  args: { value: 'true' },
};

export const NoHeaderRow: Story = {
  args: { value: 'false' },
};
