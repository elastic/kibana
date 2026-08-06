/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, within } from '@testing-library/react';

import type { DataSource } from '../../common';
import { getMockDataSourceConnectionStatus } from '../data_source_connection_status';
import { mainTranslations } from '../main_i18n';
import { DataSourceSuperSelect } from './data_source_super_select';

describe('DataSourceSuperSelect', () => {
  const dataSources: DataSource[] = [
    { name: 'amazon-s3-test', type: 's3', description: '', settings: {} },
    { name: 'azure-blob', type: 'azure', description: '', settings: {} },
  ];

  const renderSelect = (props: Partial<React.ComponentProps<typeof DataSourceSuperSelect>> = {}) => {
    const onChange = jest.fn();
    const onConnectNewDataSource = jest.fn();

    const view = render(
      <EuiProvider>
        <DataSourceSuperSelect
          dataSources={dataSources}
          onChange={onChange}
          onConnectNewDataSource={onConnectNewDataSource}
          placeholder="Select a data source"
          connectNewDataSourceLabel="Connect new data source"
          aria-label="Data source"
          data-test-subj="datasetWizardDataSource"
          {...props}
        />
      </EuiProvider>
    );

    return { ...view, onChange, onConnectNewDataSource };
  };

  it('shows connection status for each data source in the dropdown', () => {
    const { getByTestId, getAllByRole } = renderSelect();

    fireEvent.click(getByTestId('datasetWizardDataSource'));

    const options = getAllByRole('option');

    expect(options).toHaveLength(2);

    dataSources.forEach((dataSource, index) => {
      const status = getMockDataSourceConnectionStatus(dataSource.name);
      const statusLabel =
        status === 'connected'
          ? mainTranslations.columns.dataSources.connectionStatusConnected
          : mainTranslations.columns.dataSources.connectionStatusBroken;

      expect(within(options[index]).getByText(dataSource.name)).toBeInTheDocument();
      expect(within(options[index]).getByText(statusLabel)).toBeInTheDocument();
    });
  });

  it('shows connection status in the selected value display', () => {
    const { getByTestId } = renderSelect({ value: 'amazon-s3-test' });

    const status = getMockDataSourceConnectionStatus('amazon-s3-test');
    const statusLabel =
      status === 'connected'
        ? mainTranslations.columns.dataSources.connectionStatusConnected
        : mainTranslations.columns.dataSources.connectionStatusBroken;

    const control = getByTestId('datasetWizardDataSource');

    expect(within(control).getByText('amazon-s3-test')).toBeInTheDocument();
    expect(within(control).getByText(statusLabel)).toBeInTheDocument();
  });
});
