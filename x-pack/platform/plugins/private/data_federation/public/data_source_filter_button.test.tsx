/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, waitFor } from '@testing-library/react';

import { DataSourceFilterButton } from './data_source_filter_button';

describe('DataSourceFilterButton', () => {
  it('opens a multiselect popover and toggles data source filters', async () => {
    const onChange = jest.fn();

    const { getByTestId, getByText } = render(
      <EuiProvider>
        <DataSourceFilterButton
          dataSourceNames={['amazon-s3-test', 'test2']}
          selectedDataSourceNames={[]}
          onChange={onChange}
        />
      </EuiProvider>
    );

    fireEvent.click(getByTestId('dataSetsSetsDataSourceFilter'));

    await waitFor(() => {
      expect(getByText('amazon-s3-test')).toBeInTheDocument();
    });

    fireEvent.click(getByText('amazon-s3-test'));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(['amazon-s3-test']);
    });
  });
});
