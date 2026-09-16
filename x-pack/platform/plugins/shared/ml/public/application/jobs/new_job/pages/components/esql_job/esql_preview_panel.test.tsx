/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '../../../../../test_utils/render_with_ml_context';
import { EsqlPreviewPanel } from './esql_preview_panel';
import { EsqlWizardProvider } from './esql_wizard_context';

const mockDatafeedPreview = jest.fn();

jest.mock('../../../../../contexts/kibana/use_ml_api_context', () => ({
  useMlApi: () => ({
    jobs: { datafeedPreview: mockDatafeedPreview },
  }),
}));

describe('EsqlPreviewPanel', () => {
  beforeEach(() => {
    mockDatafeedPreview.mockReset();
  });

  it('calls preview with the wizard start and end rather than the unbounded classic range', async () => {
    mockDatafeedPreview.mockResolvedValue([{ bucket: '2026-01-01T00:00:00.000Z', avg_bytes: 42 }]);

    renderWithI18n(
      <EsqlWizardProvider>
        <EsqlPreviewPanel />
      </EsqlWizardProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    await waitFor(() => expect(mockDatafeedPreview).toHaveBeenCalledTimes(1));

    expect(mockDatafeedPreview).toHaveBeenCalledWith(
      undefined,
      expect.any(Object),
      expect.any(Object),
      'now-15m',
      'now'
    );
    expect(mockDatafeedPreview.mock.calls[0][3]).not.toBe('0');
    expect(mockDatafeedPreview.mock.calls[0][4]).not.toBe('MAX');
  });

  it('renders returned output rows including null and nested values safely', async () => {
    mockDatafeedPreview.mockResolvedValue([
      { bucket: '2026-01-01T00:00:00.000Z', nested: { host: 'web-1' }, nullable: null },
    ]);

    renderWithI18n(
      <EsqlWizardProvider>
        <EsqlPreviewPanel />
      </EsqlWizardProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(await screen.findByText('{"host":"web-1"}')).toBeInTheDocument();
  });

  it('shows the Elasticsearch error reason', async () => {
    mockDatafeedPreview.mockRejectedValue({
      body: { attributes: { body: { error: { reason: 'invalid ES|QL query' } } } },
    });

    renderWithI18n(
      <EsqlWizardProvider>
        <EsqlPreviewPanel />
      </EsqlWizardProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(await screen.findByText('invalid ES|QL query')).toBeInTheDocument();
  });

  it('reports an empty preview response', async () => {
    mockDatafeedPreview.mockResolvedValue([]);

    renderWithI18n(
      <EsqlWizardProvider>
        <EsqlPreviewPanel />
      </EsqlWizardProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(
      await screen.findByText('No output rows were returned for the selected time range.')
    ).toBeInTheDocument();
  });

  it('discards a stale response after a later preview completes', async () => {
    let firstResolve: (rows: Array<Record<string, unknown>>) => void;
    const first = new Promise<Array<Record<string, unknown>>>((resolve) => {
      firstResolve = resolve;
    });
    mockDatafeedPreview.mockReturnValueOnce(first).mockResolvedValueOnce([{ bucket: 'fresh' }]);

    renderWithI18n(
      <EsqlWizardProvider>
        <EsqlPreviewPanel />
      </EsqlWizardProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(await screen.findByText('fresh')).toBeInTheDocument();
    firstResolve!([{ bucket: 'stale' }]);

    await waitFor(() => expect(screen.queryByText('stale')).not.toBeInTheDocument());
  });
});
