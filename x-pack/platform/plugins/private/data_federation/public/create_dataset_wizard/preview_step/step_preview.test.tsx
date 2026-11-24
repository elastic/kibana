/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { getESQLAdHocDataview } from '@kbn/esql-utils';

import { DATASET_PREVIEW_QUERY } from './dataset_preview';
import { StepPreview, type StepPreviewProps } from './step_preview';

jest.mock('@kbn/esql-utils', () => ({
  ...jest.requireActual('@kbn/esql-utils'),
  getESQLAdHocDataview: jest.fn(),
}));

const mockEsqlDataGridProps = jest.fn();

jest.mock('@kbn/esql-datagrid/public', () => ({
  ESQLDataGrid: (props: { rows: unknown[] }) => {
    mockEsqlDataGridProps(props);
    return <div data-test-subj="mockEsqlDataGrid">{props.rows.length} rows</div>;
  },
}));

const getESQLAdHocDataviewMock = getESQLAdHocDataview as jest.MockedFunction<
  typeof getESQLAdHocDataview
>;

const esql = jest.fn();
const dataViews = {};
const http = {};

const renderStep = (props: StepPreviewProps = {}) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <KibanaContextProvider services={{ data: { search: { esql }, dataViews }, http }}>
          <StepPreview {...props} />
        </KibanaContextProvider>
      </I18nProvider>
    </EuiProvider>
  );

const toResponse = (values: unknown[][]) => ({
  rawResponse: { columns: [{ name: 'message', type: 'keyword' }], values },
  requestParams: { query: DATASET_PREVIEW_QUERY },
});

const mockResults = (values: unknown[][]) => {
  esql.mockResolvedValue(toResponse(values));
  getESQLAdHocDataviewMock.mockResolvedValue(
    {} as unknown as Awaited<ReturnType<typeof getESQLAdHocDataview>>
  );
};

describe('StepPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('describes what the preview shows', async () => {
    mockResults([['hello']]);
    renderStep();

    expect(
      screen.getByText(
        'Shows the first 10 rows read from your dataset using the current configuration.'
      )
    ).toBeInTheDocument();
    await screen.findByTestId('mockEsqlDataGrid');
  });

  it('runs the preview query the same way the ES|QL views preview does', async () => {
    mockResults([['hello']]);
    renderStep();

    expect(screen.getByTestId('createDatasetWizardPreviewLoading')).toBeInTheDocument();
    expect(await screen.findByTestId('mockEsqlDataGrid')).toHaveTextContent('1 rows');

    expect(esql).toHaveBeenCalledWith(
      { query: 'FROM kibana_sample_data_ecommerce', columnMetadata: true },
      { abortSignal: expect.any(AbortSignal) }
    );
    expect(getESQLAdHocDataviewMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dataViewsService: dataViews,
        http,
        query: 'FROM kibana_sample_data_ecommerce',
      })
    );
  });

  it('re-runs the preview query when Refresh is clicked', async () => {
    mockResults([['hello']]);
    renderStep();
    expect(await screen.findByTestId('mockEsqlDataGrid')).toHaveTextContent('1 rows');

    esql.mockResolvedValue(toResponse([['hello'], ['world']]));
    await userEvent.click(screen.getByTestId('createDatasetWizardPreviewRefreshButton'));

    expect(esql).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('2 rows')).toBeInTheDocument();
  });

  it('keeps showing the previous results while a refresh is running', async () => {
    mockResults([['hello']]);
    renderStep();
    await screen.findByTestId('mockEsqlDataGrid');

    esql.mockReturnValue(new Promise(() => {}));
    await userEvent.click(screen.getByTestId('createDatasetWizardPreviewRefreshButton'));

    expect(screen.getByTestId('mockEsqlDataGrid')).toHaveTextContent('1 rows');
    expect(screen.queryByTestId('createDatasetWizardPreviewLoading')).not.toBeInTheDocument();
  });

  it('restores the grid from the persisted state and reports changes back', async () => {
    mockResults([['hello']]);
    const gridState = { columns: ['message'], rowsPerPage: 25 };
    const onGridStateChange = jest.fn();
    renderStep({ gridState, onGridStateChange });

    await screen.findByTestId('mockEsqlDataGrid');
    expect(mockEsqlDataGridProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ initialState: gridState, onStateChange: onGridStateChange })
    );
  });

  it('says so when the query returns no rows', async () => {
    mockResults([]);
    renderStep();

    expect(await screen.findByTestId('createDatasetWizardPreviewNoResults')).toBeInTheDocument();
  });

  it('shows the error when the query fails', async () => {
    esql.mockRejectedValue(new Error('Unknown index [kibana_sample_data_ecommerce]'));
    getESQLAdHocDataviewMock.mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof getESQLAdHocDataview>>
    );
    renderStep();

    expect(await screen.findByTestId('createDatasetWizardPreviewError')).toHaveTextContent(
      'Unknown index [kibana_sample_data_ecommerce]'
    );
  });
});
