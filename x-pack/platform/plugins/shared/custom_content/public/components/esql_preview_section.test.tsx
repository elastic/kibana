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
  isPreviewLoading: false,
  previewData: null,
  previewError: null,
  onPreview: jest.fn(),
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

  it('shows the preview error callout when previewError is provided', () => {
    render(<EsqlPreviewSection {...defaultProps} previewError="query failed" />);
    expect(screen.getByText('Preview failed')).toBeInTheDocument();
    expect(screen.getByText('query failed')).toBeInTheDocument();
  });

  it('shows the preview data table when previewData has columns and values', () => {
    const previewData = {
      columns: [{ name: 'count', type: 'long' }],
      values: [[42]],
      all_columns: [],
    } as unknown as EsqlDataResult;

    render(<EsqlPreviewSection {...defaultProps} previewData={previewData} />);

    expect(screen.getByText('count')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
