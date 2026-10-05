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

import type { DatasetPartitionDetectionFormValue } from '../../create_dataset_form_state';
import { fieldStoryDecorator } from '../../__stories__/field_story_decorator';
import type { ComboBoxChange } from '../combo_box_selection_validity';
import { PartitionDetectionSelect } from './partition_detection_select';

type PartitionDetectionSelectProps = ComponentProps<typeof PartitionDetectionSelect>;

const meta: Meta<typeof PartitionDetectionSelect> = {
  component: PartitionDetectionSelect,
  title: 'data_federation/Fields/PartitionDetectionSelect',
  decorators: [fieldStoryDecorator],
  args: {
    value: '',
    isInvalid: false,
    onChange: action('onChange'),
    onBlur: action('onBlur'),
  },
  argTypes: {
    value: { control: 'select', options: ['', 'auto', 'hive', 'template', 'none'] },
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs<PartitionDetectionSelectProps>();
    const onChange = (change: ComboBoxChange<DatasetPartitionDetectionFormValue>) => {
      args.onChange(change);
      updateArgs({ value: change.value });
    };
    return <PartitionDetectionSelect {...args} onChange={onChange} />;
  },
};

export default meta;
type Story = StoryObj<typeof PartitionDetectionSelect>;

export const Empty: Story = {};

export const Selected: Story = {
  args: { value: 'hive' },
};
