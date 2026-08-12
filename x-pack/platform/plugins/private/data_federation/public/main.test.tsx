/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { mainTranslations } from './main_i18n';
import { Main } from './main';
import type { DataSetWithName, DataSource } from '../common';

jest.mock('./datasets_tab_content', () => ({
  DatasetsTabContent: () => <div data-test-subj="datasetsTabContent" />,
}));

jest.mock('./data_sources_tab_content', () => ({
  DataSourcesTabContent: () => <div data-test-subj="dataSourcesTabContent" />,
}));

const createToastsMock = () => ({
  addSuccess: jest.fn(),
  addDanger: jest.fn(),
});

const createServicesMock = ({
  dataSources,
  dataSets,
}: {
  dataSources: DataSource[];
  dataSets: DataSetWithName[];
}) => ({
  dataSourcesClient: {
    get: jest.fn().mockResolvedValue(dataSources),
  },
  datasetsClient: {
    get: jest.fn().mockResolvedValue(dataSets),
  },
  toasts: createToastsMock(),
});

describe('Main', () => {
  it('defaults to the data sources tab when both lists are empty', async () => {
    const services = createServicesMock({ dataSources: [], dataSets: [] });

    const { getByRole, getByTestId, queryByTestId } = render(
      <EuiProvider>
        <MockAppHeaderProvider>
          <KibanaContextProvider services={services}>
            <MemoryRouter initialEntries={['/datasets']}>
              <Main />
            </MemoryRouter>
          </KibanaContextProvider>
        </MockAppHeaderProvider>
      </EuiProvider>
    );

    // Starts on the sets tab, but should switch to sources once both requests complete.
    expect(getByTestId('datasetsTabContent')).toBeInTheDocument();
    expect(queryByTestId('dataSourcesTabContent')).toBeNull();

    await waitFor(() => {
      expect(getByTestId('dataSourcesTabContent')).toBeInTheDocument();
    });

    expect(getByRole('tab', { name: mainTranslations.tabs.sources })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('switches tabs when user clicks a tab', async () => {
    const services = createServicesMock({
      dataSources: [{ name: 'my-source', type: 's3', description: '', settings: {} }],
      dataSets: [],
    });

    const { getByRole, getByTestId, queryByTestId } = render(
      <EuiProvider>
        <MockAppHeaderProvider>
          <KibanaContextProvider services={services}>
            <MemoryRouter initialEntries={['/datasets']}>
              <Main />
            </MemoryRouter>
          </KibanaContextProvider>
        </MockAppHeaderProvider>
      </EuiProvider>
    );

    expect(getByTestId('datasetsTabContent')).toBeInTheDocument();
    expect(queryByTestId('dataSourcesTabContent')).toBeNull();

    fireEvent.click(getByRole('tab', { name: mainTranslations.tabs.sources }));

    await waitFor(() => {
      expect(getByTestId('dataSourcesTabContent')).toBeInTheDocument();
    });

    expect(getByRole('tab', { name: mainTranslations.tabs.sources })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
});
