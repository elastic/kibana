/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PropsOf } from '@elastic/eui';
import { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { decorateWithGlobalStorybookThemeProviders } from '../test_utils/use_global_storybook_theme';
import { DataSearchProgress } from './data_search_progress';

export default {
  title: 'infra/dataSearch/DataSearchProgress',
  decorators: [
    (wrappedStory) => <div style={{ width: 400 }}>{wrappedStory()}</div>,
    decorateWithGlobalStorybookThemeProviders,
  ],
  parameters: {
    layout: 'padded',
  },
} as Meta;

type DataSearchProgressProps = PropsOf<typeof DataSearchProgress>;

const DataSearchProgressTemplate: StoryFn<DataSearchProgressProps> = (args) => (
  <DataSearchProgress {...args} />
);

export const UndeterminedProgress = {
  render: DataSearchProgressTemplate,
};

export const DeterminedProgress = {
  render: DataSearchProgressTemplate,

  args: {
    label: 'Searching',
    maxValue: 10,
    value: 3,
  },
};

export const CancelableDeterminedProgress = {
  render: DataSearchProgressTemplate,

  args: {
    label: 'Searching',
    maxValue: 10,
    value: 3,
  },

  argTypes: {
    onCancel: { action: 'canceled' },
  },
};
