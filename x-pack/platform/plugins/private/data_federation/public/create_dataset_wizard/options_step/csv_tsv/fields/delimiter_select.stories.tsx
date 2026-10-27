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
import { DelimiterSelect } from './delimiter_select';

type DelimiterSelectProps = ComponentProps<typeof DelimiterSelect>;

const meta: Meta<typeof DelimiterSelect> = {
  component: DelimiterSelect,
  title: 'data_federation/Fields/DelimiterSelect',
  decorators: [fieldStoryDecorator],
  args: {
    value: '',
    defaultValue: ',',
    onChange: action('onChange'),
    onBlur: action('onBlur'),
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs<DelimiterSelectProps>();
    const onChange = (value: string) => {
      args.onChange(value);
      updateArgs({ value });
    };
    return <DelimiterSelect {...args} onChange={onChange} />;
  },
};

export default meta;
type Story = StoryObj<typeof DelimiterSelect>;

export const CsvDefault: Story = {};

export const TsvDefault: Story = {
  args: { defaultValue: '\t' },
};

export const PresetDelimiter: Story = {
  args: { value: ';' },
};

export const CustomDelimiter: Story = {
  args: { value: '~' },
};
