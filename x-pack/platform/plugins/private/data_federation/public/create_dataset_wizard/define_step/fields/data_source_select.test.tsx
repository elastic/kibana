/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import type { DataSource } from '../../../../common';
import { DataSourceSelect } from './data_source_select';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      dataSourcesClient: {
        add: jest.fn(),
      },
    },
  }),
}));

const renderComponent = () => {
  const Wrapper = () => {
    const [value, setValue] = useState('');
    const dataSources: DataSource[] = [
      { type: 's3', name: 'my-s3', description: 'desc', settings: {} },
    ];

    return (
      <>
        <DataSourceSelect
          dataSources={dataSources}
          value={value}
          isInvalid={false}
          onChange={setValue}
          onBlur={() => {}}
          loadDataSources={async () => {}}
        />
        <div data-test-subj="dataSourceValue">{value}</div>
      </>
    );
  };

  return render(
    <EuiProvider>
      <I18nProvider>
        <Wrapper />
      </I18nProvider>
    </EuiProvider>
  );
};

describe('DataSourceSelect', () => {
  it('updates value when an existing data source is selected', async () => {
    const { getByTestId } = renderComponent();

    await act(async () => {
      fireEvent.click(getByTestId('createDatasetDataSource'));
    });

    await act(async () => {
      fireEvent.click(getByTestId('createDatasetDataSource-my-s3'));
    });

    expect(getByTestId('dataSourceValue')).toHaveTextContent('my-s3');
  });
});
