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
import type { DatasetBooleanFormValue } from '../../../create_dataset_form_state';
import { TrimSpaces } from './trim_spaces';

type TrimSpacesProps = ComponentProps<typeof TrimSpaces>;

const meta: Meta<typeof TrimSpaces> = {
  component: TrimSpaces,
  title: 'data_federation/Fields/TrimSpaces',
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
    const [, updateArgs] = useArgs<TrimSpacesProps>();
    const onChange = (change: ComboBoxChange<DatasetBooleanFormValue>) => {
      args.onChange(change);
      updateArgs({ value: change.value });
    };
    return <TrimSpaces {...args} onChange={onChange} />;
  },
};

export default meta;
type Story = StoryObj<typeof TrimSpaces>;

export const Empty: Story = {};

export const Enabled: Story = {
  args: { value: 'true' },
};
