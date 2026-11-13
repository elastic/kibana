/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { getESQLAdHocDataview, getESQLResults } from '@kbn/esql-utils';

import { DATASET_PREVIEW_QUERY, DatasetPreview } from './dataset_preview';

jest.mock('@kbn/esql-utils', () => ({
  ...jest.requireActual('@kbn/esql-utils'),
  getESQLAdHocDataview: jest.fn(),
  getESQLResults: jest.fn(),
}));

jest.mock('@kbn/esql-datagrid/public', () => ({
  ESQLDataGrid: ({ rows }: { rows: unknown[] }) => (
    <div data-test-subj="mockEsqlDataGrid">{rows.length} rows</div>
  ),
}));

const getESQLResultsMock = getESQLResults as jest.MockedFunction<typeof getESQLResults>;
const getESQLAdHocDataviewMock = getESQLAdHocDataview as jest.MockedFunction<
  typeof getESQLAdHocDataview
>;

const search = jest.fn();
const dataViews = {};
const http = {};

const renderPreview = () =>
  render(
    <EuiProvider>
      <I18nProvider>
        <KibanaContextProvider services={{ data: { search: { search }, dataViews }, http }}>
          <DatasetPreview />
        </KibanaContextProvider>
      </I18nProvider>
    </EuiProvider>
  );

const mockResults = (values: unknown[][]) => {
  getESQLResultsMock.mockResolvedValue({
    response: { columns: [{ name: 'message', type: 'keyword' }], values },
    params: { query: DATASET_PREVIEW_QUERY },
  } as unknown as Awaited<ReturnType<typeof getESQLResults>>);
  getESQLAdHocDataviewMock.mockResolvedValue(
    {} as unknown as Awaited<ReturnType<typeof getESQLAdHocDataview>>
  );
};

describe('DatasetPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs the preview query the same way the ES|QL views preview does', async () => {
    mockResults([['hello']]);
    renderPreview();

    expect(screen.getByTestId('createDatasetWizardPreviewLoading')).toBeInTheDocument();
    expect(await screen.findByTestId('mockEsqlDataGrid')).toHaveTextContent('1 rows');

    expect(getESQLResultsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        esqlQuery: 'FROM kibana_sample_data_ecommerce',
        includeColumnMetadata: true,
        search,
      })
    );
    expect(getESQLAdHocDataviewMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dataViewsService: dataViews,
        http,
        query: 'FROM kibana_sample_data_ecommerce',
      })
    );
  });

  it('says so when the query returns no rows', async () => {
    mockResults([]);
    renderPreview();

    expect(await screen.findByTestId('createDatasetWizardPreviewNoResults')).toBeInTheDocument();
  });

  it('shows the error when the query fails', async () => {
    getESQLResultsMock.mockRejectedValue(new Error('Unknown index [kibana_sample_data_ecommerce]'));
    getESQLAdHocDataviewMock.mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof getESQLAdHocDataview>>
    );
    renderPreview();

    expect(await screen.findByTestId('createDatasetWizardPreviewError')).toHaveTextContent(
      'Unknown index [kibana_sample_data_ecommerce]'
    );
  });
});
