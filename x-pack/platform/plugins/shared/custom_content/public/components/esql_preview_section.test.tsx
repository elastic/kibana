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
import type { EsqlDataResult } from '@kbn/custom-content-renderer';

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

  it('shows the time filter hint on mount when the query has no time field', async () => {
    mockGetESQLTimeField.mockResolvedValue(undefined);

    render(<EsqlPreviewSection {...defaultProps} esqlQuery="FROM logs | LIMIT 10" />);
    await act(async () => {});

    expect(screen.getByText(/connect the query to the dashboard time filter/i)).toBeInTheDocument();
  });

  it('does not flash the time filter hint while detection is still pending', () => {
    mockGetESQLTimeField.mockReturnValue(new Promise(() => {}));

    render(<EsqlPreviewSection {...defaultProps} esqlQuery="FROM logs | LIMIT 10" />);

    expect(
      screen.queryByText(/connect the query to the dashboard time filter/i)
    ).not.toBeInTheDocument();
  });

  it('does not show the time filter hint on mount when a time field is detected', async () => {
    mockGetESQLTimeField.mockResolvedValue('@timestamp');

    render(<EsqlPreviewSection {...defaultProps} esqlQuery="FROM logs | LIMIT 10" />);
    await act(async () => {});

    expect(
      screen.queryByText(/connect the query to the dashboard time filter/i)
    ).not.toBeInTheDocument();
  });

  it('shows the hint after clicking preview when the query has no time field', async () => {
    mockGetESQLTimeField.mockResolvedValue(undefined);

    render(<EsqlPreviewSection {...defaultProps} esqlQuery="FROM logs | LIMIT 10" />);
    await userEvent.click(screen.getByRole('button', { name: 'Preview data' }));
    await act(async () => {});

    expect(screen.getByText(/connect the query to the dashboard time filter/i)).toBeInTheDocument();
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

  it('truncates a long cell and keeps the full value in the title', () => {
    const long = 'x'.repeat(500);
    const esqlData = {
      columns: [{ name: 'steps', type: 'keyword' }],
      values: [[long]],
      all_columns: [],
    } as unknown as EsqlDataResult;

    render(<EsqlPreviewSection {...defaultProps} esqlData={esqlData} />);

    const cell = screen.getByTitle(long);
    expect(cell.textContent).toBe(`${'x'.repeat(120)}…`);
  });

  it('keeps the full column name in the header title', () => {
    const name = 'a_very_long_column_name_that_will_not_fit_in_its_share_of_the_table';
    const esqlData = {
      columns: [{ name, type: 'keyword' }],
      values: [['v']],
      all_columns: [],
    } as unknown as EsqlDataResult;

    render(<EsqlPreviewSection {...defaultProps} esqlData={esqlData} />);

    expect(screen.getByRole('columnheader')).toHaveAttribute('title', name);
  });

  it('joins a multivalue cell rather than rendering it as a bare array', () => {
    const esqlData = {
      columns: [{ name: 'tactics', type: 'keyword' }],
      values: [[['Initial Access', 'Execution']]],
      all_columns: [],
    } as unknown as EsqlDataResult;

    render(<EsqlPreviewSection {...defaultProps} esqlData={esqlData} />);

    expect(screen.getByText('Initial Access, Execution')).toBeInTheDocument();
  });
});
