/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FileTray } from './file_tray';
import type { TrayFile } from './use_file_tray';

const pdf = new File(['%PDF'], 'report.pdf', { type: 'application/pdf' });

const renderTray = (trayFile: TrayFile | null, trayError: string | null = null) => {
  const onRemove = jest.fn();
  render(<FileTray trayFile={trayFile} trayError={trayError} onRemove={onRemove} />);
  return { onRemove };
};

describe('FileTray', () => {
  it('renders nothing when empty', () => {
    renderTray(null);

    expect(screen.queryByTestId('comment-file-tray')).not.toBeInTheDocument();
  });

  it('shows the file name and the upload status', () => {
    renderTray({ file: pdf, status: 'uploading' });

    expect(screen.getByTestId('comment-file-tray-chip')).toHaveTextContent('report.pdf');
    expect(screen.getByTestId('comment-file-tray-status')).toHaveTextContent('Uploading…');
  });

  it('shows no status once uploaded', () => {
    renderTray({ file: pdf, status: 'uploaded', id: 'file-1' });

    expect(screen.queryByTestId('comment-file-tray-status')).not.toBeInTheDocument();
  });

  it('shows the validation error of a rejected file', () => {
    renderTray({ file: pdf, status: 'idle', error: new Error('File is too large') });

    expect(screen.getByTestId('comment-file-tray-status')).toHaveTextContent('File is too large');
  });

  it('calls onRemove from the remove button', async () => {
    const { onRemove } = renderTray({ file: pdf, status: 'uploaded', id: 'file-1' });

    await userEvent.click(screen.getByRole('button', { name: 'Remove report.pdf' }));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('shows a tray error without a file', () => {
    renderTray(null, 'Only 1 file');

    expect(screen.getByTestId('comment-file-tray-error')).toHaveTextContent('Only 1 file');
  });
});
