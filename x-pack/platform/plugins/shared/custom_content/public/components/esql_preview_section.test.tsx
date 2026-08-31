/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@kbn/esql/public', () => ({
  ESQLLangEditor: () => null,
}));

jest.mock('@kbn/esql-utils', () => ({
  getESQLTimeField: jest.fn(),
}));

jest.mock('../services', () => ({
  getServices: () => ({ core: { http: {} } }),
}));

import { getESQLTimeField } from '@kbn/esql-utils';
import { EsqlPreviewSection } from './esql_preview_section';
import type { EsqlDataResult } from '../utils/fetch_esql_data';

const mockGetESQLTimeField = getESQLTimeField as jest.MockedFunction<typeof getESQLTimeField>;

const defaultProps = {
  esqlQuery: '',
  onEsqlQueryChange: jest.fn(),
  isDataLoading: false,
  esqlData: null,
  esqlDataError: null,
  onFetchData: jest.fn(),
};

describe('EsqlPreviewSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetESQLTimeField.mockResolvedValue(undefined);
  });

  it('renders the accordion and preview button', () => {
    render(<EsqlPreviewSection {...defaultProps} />);
    expect(screen.getByText('Data source (ES|QL)')).toBeInTheDocument();
    expect(screen.getByText('Preview data')).toBeInTheDocument();
  });

  it('shows the time picker hint on mount when the query has no time field', async () => {
    mockGetESQLTimeField.mockResolvedValue(undefined);

    render(<EsqlPreviewSection {...defaultProps} esqlQuery="FROM logs | LIMIT 10" />);
    await act(async () => {});

    expect(screen.getByText(/connect to the dashboard time picker/i)).toBeInTheDocument();
  });

  it('does not flash the time picker hint while detection is still pending', () => {
    mockGetESQLTimeField.mockReturnValue(new Promise(() => {}));

    render(<EsqlPreviewSection {...defaultProps} esqlQuery="FROM logs | LIMIT 10" />);

    expect(screen.queryByText(/connect to the dashboard time picker/i)).not.toBeInTheDocument();
  });

  it('does not show the time picker hint on mount when a time field is detected', async () => {
    mockGetESQLTimeField.mockResolvedValue('@timestamp');

    render(<EsqlPreviewSection {...defaultProps} esqlQuery="FROM logs | LIMIT 10" />);
    await act(async () => {});

    expect(screen.queryByText(/connect to the dashboard time picker/i)).not.toBeInTheDocument();
  });

  it('shows the hint after clicking preview when the query has no time field', async () => {
    mockGetESQLTimeField.mockResolvedValue(undefined);

    render(<EsqlPreviewSection {...defaultProps} esqlQuery="FROM logs | LIMIT 10" />);
    await userEvent.click(screen.getByRole('button', { name: 'Preview data' }));
    await act(async () => {});

    expect(screen.getByText(/connect to the dashboard time picker/i)).toBeInTheDocument();
  });

  it('shows the error callout when esqlDataError is provided', () => {
    render(<EsqlPreviewSection {...defaultProps} esqlDataError="query failed" />);
    expect(screen.getByText('Preview failed')).toBeInTheDocument();
    expect(screen.getByText('query failed')).toBeInTheDocument();
  });

  it('shows the data table when esqlData has columns and values', () => {
    const esqlData = {
      columns: [{ name: 'count', type: 'long' }],
      values: [[42]],
      all_columns: [],
    } as unknown as EsqlDataResult;

    render(<EsqlPreviewSection {...defaultProps} esqlData={esqlData} />);

    expect(screen.getByText('count')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
