/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { render } from '@testing-library/react';

import { ESQL_DATA_FEDERATION_DATA_SOURCES_DOCUMENTATION_URL } from '../data_federation_documentation_urls';
import { ExistingDataSourceAuthNotice } from './existing_data_source_auth_notice';

describe('ExistingDataSourceAuthNotice', () => {
  it('links to data source documentation when shown', () => {
    const { getByTestId } = render(
      <EuiProvider>
        <ExistingDataSourceAuthNotice show={true} />
      </EuiProvider>
    );

    expect(getByTestId('datasetWizardExistingDataSourceAuthNotice')).toBeInTheDocument();
    expect(getByTestId('datasetWizardExistingDataSourceAuthNoticeLearnMore')).toHaveAttribute(
      'href',
      ESQL_DATA_FEDERATION_DATA_SOURCES_DOCUMENTATION_URL
    );
  });

  it('renders nothing when hidden', () => {
    const { queryByTestId } = render(
      <EuiProvider>
        <ExistingDataSourceAuthNotice show={false} />
      </EuiProvider>
    );

    expect(queryByTestId('datasetWizardExistingDataSourceAuthNotice')).toBeNull();
  });
});
