/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import type { DataSource } from '../../../../common';
import { DataSourceSelect } from './data_source_select';
import { docLinksMock } from '../../../doc_links_mock';
import { createDatasetWizardStrings } from '../../create_dataset_wizard_i18n';

const mockDocLinks = {
  ...docLinksMock,
  links: {
    ...docLinksMock.links,
    dataFederation: {
      ...docLinksMock.links.dataFederation,
      grantReadAccess: 'https://example.com/grant-read-access',
    },
  },
};

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      dataSourcesClient: {
        add: jest.fn(),
      },
      docLinks: mockDocLinks,
    },
  }),
}));

const renderComponent = ({
  createdDataSourceNames = [],
}: { createdDataSourceNames?: readonly string[] } = {}) => {
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
          createdDataSourceNames={createdDataSourceNames}
          onDataSourceCreated={() => {}}
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

  it('does not show the authentication callout when no data source is selected', () => {
    const { queryByTestId } = renderComponent();

    expect(queryByTestId('createDatasetDataSourceAuthenticationCallout')).not.toBeInTheDocument();
  });

  it('shows the authentication callout when an existing data source is selected', async () => {
    const { getByTestId } = renderComponent();

    await act(async () => {
      fireEvent.click(getByTestId('createDatasetDataSource'));
    });

    await act(async () => {
      fireEvent.click(getByTestId('createDatasetDataSource-my-s3'));
    });

    expect(getByTestId('createDatasetDataSourceAuthenticationCallout')).toHaveTextContent(
      createDatasetWizardStrings.dataSourceAuthenticationCalloutTitle
    );
    // scoped to the visible content, which excludes `announceOnMount`'s screen reader copy
    expect(
      within(getByTestId('createDatasetDataSourceAuthenticationCallout__content')).getByTestId(
        'createDatasetDataSourceAuthenticationLearnMore'
      )
    ).toHaveAttribute('href', 'https://example.com/grant-read-access');
  });

  it('does not show the authentication callout when the selected data source was created in the wizard', async () => {
    const { getByTestId, queryByTestId } = renderComponent({ createdDataSourceNames: ['my-s3'] });

    await act(async () => {
      fireEvent.click(getByTestId('createDatasetDataSource'));
    });

    await act(async () => {
      fireEvent.click(getByTestId('createDatasetDataSource-my-s3'));
    });

    expect(getByTestId('dataSourceValue')).toHaveTextContent('my-s3');
    expect(queryByTestId('createDatasetDataSourceAuthenticationCallout')).not.toBeInTheDocument();
  });
});
