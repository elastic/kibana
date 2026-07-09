/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, waitFor } from '@testing-library/react';

import type { ToastsStart } from '@kbn/core/public';
import type { DataSourcesClient } from '../data_sources_client';
import type { DataSource } from '../../common/datasource_types';
import { CreateDataSourceFlyout } from './create_data_source_flyout';

const createToastsMock = (): ToastsStart =>
  ({
    addSuccess: jest.fn(),
    addDanger: jest.fn(),
  } as unknown as ToastsStart);

const createClientMock = (): DataSourcesClient =>
  ({
    add: jest.fn().mockResolvedValue(undefined),
    getById: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  } as unknown as DataSourcesClient);

describe('CreateDataSourceFlyout', () => {
  it('renders core actions and disables save while saving', async () => {
    const toasts = createToastsMock();
    const client = createClientMock();
    let resolveSave: (value: string | null) => void;
    const savePromise = new Promise<string | null>((resolve) => {
      resolveSave = resolve;
    });
    const onSave = jest.fn().mockReturnValue(savePromise);

    const initialDataSource: DataSource = {
      type: 's3',
      name: 'ds',
      description: '',
      settings: {
        region: '',
        endpoint: '',
        access_key: '',
        secret_key: '',
      } as any,
    } as any;

    const { getByTestId } = render(
      <EuiProvider>
        <CreateDataSourceFlyout
          dataSourcesClient={client}
          toasts={toasts}
          onClose={jest.fn()}
          onSave={onSave}
          existingDataSourceNames={[]}
          initialDataSource={initialDataSource}
        />
      </EuiProvider>
    );

    expect(getByTestId('createDataSourceFlyoutSubmit')).toBeInTheDocument();

    fireEvent.click(getByTestId('createDataSourceFlyoutSubmit'));

    await waitFor(() => {
      expect(getByTestId('createDataSourceFlyoutSubmit')).toBeDisabled();
    });

    resolveSave!(null);
    await waitFor(() => {
      expect(getByTestId('createDataSourceFlyoutSubmit')).not.toBeDisabled();
    });
  });

  it('shows the S3 region field without expanding connection settings, and requires it on create', async () => {
    const toasts = createToastsMock();
    const client = createClientMock();
    const onSave = jest.fn().mockResolvedValue(null);

    const { getByTestId, queryByText } = render(
      <EuiProvider>
        <CreateDataSourceFlyout
          dataSourcesClient={client}
          toasts={toasts}
          onClose={jest.fn()}
          onSave={onSave}
          existingDataSourceNames={[]}
        />
      </EuiProvider>
    );

    // Region is visible up front, without expanding "Show connection settings".
    expect(getByTestId('createDataSourceFlyoutS3Region')).toBeInTheDocument();

    fireEvent.change(getByTestId('createDataSourceFlyoutName'), { target: { value: 'my-ds' } });
    fireEvent.click(getByTestId('createDataSourceFlyoutSubmit'));

    await waitFor(() => {
      expect(queryByText('Region is required.')).toBeInTheDocument();
    });
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.change(getByTestId('createDataSourceFlyoutS3Region'), {
      target: { value: 'us-east-1' },
    });

    await waitFor(() => {
      expect(queryByText('Region is required.')).not.toBeInTheDocument();
    });
  });
});
