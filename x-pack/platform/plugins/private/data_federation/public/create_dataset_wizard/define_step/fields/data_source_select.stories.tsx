/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { useArgs } from '@storybook/preview-api';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import type { DataSource } from '../../../../common';
import { storybookDocLinksMock } from '../../../__stories__/doc_links_mock';
import { fieldStoryDecorator } from '../../__stories__/field_story_decorator';
import { DataSourceSelect } from './data_source_select';

type DataSourceSelectProps = ComponentProps<typeof DataSourceSelect>;

const dataSources: DataSource[] = [
  { name: 'logs-s3', type: 's3', description: '', settings: {} },
  { name: 'archive-gcs', type: 'gcs', description: '', settings: {} },
  { name: 'metrics-azure', type: 'azure', description: '', settings: {} },
];

const kibanaContextDecorator: Decorator = (Story) => (
  <KibanaContextProvider
    services={{
      docLinks: storybookDocLinksMock,
      dataSourcesClient: { add: action('dataSourcesClient.add') },
      featureFlags: {},
    }}
  >
    <Story />
  </KibanaContextProvider>
);

const meta: Meta<typeof DataSourceSelect> = {
  component: DataSourceSelect,
  title: 'data_federation/Fields/DataSourceSelect',
  decorators: [fieldStoryDecorator, kibanaContextDecorator],
  args: {
    dataSources,
    value: '',
    isInvalid: false,
    onChange: action('onChange'),
    onBlur: action('onBlur'),
    loadDataSources: async () => {},
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs<DataSourceSelectProps>();
    const onChange = (value: string) => {
      args.onChange(value);
      updateArgs({ value });
    };
    return <DataSourceSelect {...args} onChange={onChange} />;
  },
};

export default meta;
type Story = StoryObj<typeof DataSourceSelect>;

export const Empty: Story = {};

export const Selected: Story = {
  args: { value: 'logs-s3' },
};

export const Invalid: Story = {
  args: { isInvalid: true },
};

export const NoDataSources: Story = {
  args: { dataSources: [] },
};
