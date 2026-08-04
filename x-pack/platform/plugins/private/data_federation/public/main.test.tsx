/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';

import type { ToastsStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Main } from './main';
import type { DataFederationKibanaServices } from './types';

jest.mock('./data_federation_home', () => ({
  DataFederationHome: () => <div data-test-subj="dataFederationHome" />,
}));

jest.mock('./create_dataset_wizard', () => ({
  DatasetWizardPage: () => <div data-test-subj="datasetWizardPage" />,
}));

const createToastsMock = (): ToastsStart =>
  ({
    addSuccess: jest.fn(),
    addDanger: jest.fn(),
  } as unknown as ToastsStart);

const createServicesMock = ({
  dataSources,
  dataSets,
}: {
  dataSources: unknown[];
  dataSets: unknown[];
}): DataFederationKibanaServices =>
  ({
    dataSourcesClient: {
      get: jest.fn().mockResolvedValue(dataSources),
    },
    datasetsClient: {
      get: jest.fn().mockResolvedValue(dataSets),
    },
    toasts: createToastsMock(),
  } as unknown as DataFederationKibanaServices);

describe('Main', () => {
  const renderMain = () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });

    return render(
      <EuiProvider>
        <Router history={history}>
          <KibanaContextProvider services={createServicesMock({ dataSources: [], dataSets: [] })}>
            <Main />
          </KibanaContextProvider>
        </Router>
      </EuiProvider>
    );
  };

  it('renders the home route by default', () => {
    const { getByTestId } = renderMain();
    expect(getByTestId('dataFederationHome')).toBeInTheDocument();
  });
});
