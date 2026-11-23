/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { AddSourcePanel } from './add_source_panel';

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

describe('AddSourcePanel', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const baseProps = {
    title: 'Panel title',
    pendingCount: 0,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    isSaving: false,
    children: <span data-test-subj="panelChild">Content</span>,
    'data-test-subj': 'testAddSourcePanel',
  };

  it('disables confirm when pendingCount is 0', () => {
    renderWithProviders(<AddSourcePanel {...baseProps} />);

    const confirm = screen.getByTestId('contextAddSourcesConfirmButton');
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveTextContent('Add sources');
  });

  it('disables confirm and shows loading while isSaving', () => {
    renderWithProviders(<AddSourcePanel {...baseProps} pendingCount={2} isSaving />);

    const confirm = screen.getByTestId('contextAddSourcesConfirmButton');
    expect(confirm).toBeDisabled();
    expect(confirm.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
    expect(screen.getByTestId('contextAddSourcesCancelButton')).toBeDisabled();
  });

  it('uses singular confirm label when one source is pending', () => {
    renderWithProviders(<AddSourcePanel {...baseProps} pendingCount={1} />);

    expect(screen.getByTestId('contextAddSourcesConfirmButton')).toHaveTextContent('Add source');
  });

  it('uses plural confirm label when multiple sources are pending', () => {
    renderWithProviders(<AddSourcePanel {...baseProps} pendingCount={3} />);

    expect(screen.getByTestId('contextAddSourcesConfirmButton')).toHaveTextContent('Add 3 sources');
  });

  it('calls onClose and onConfirm when action buttons are clicked', () => {
    const onClose = jest.fn();
    const onConfirm = jest.fn();

    renderWithProviders(
      <AddSourcePanel {...baseProps} pendingCount={1} onClose={onClose} onConfirm={onConfirm} />
    );

    fireEvent.click(screen.getByTestId('contextAddSourcesCancelButton'));
    fireEvent.click(screen.getByTestId('contextAddSourcesConfirmButton'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders the header action slot when provided', () => {
    renderWithProviders(
      <AddSourcePanel
        {...baseProps}
        headerAction={<button type="button" data-test-subj="panelHeaderAction" />}
      />
    );

    expect(screen.getByTestId('panelHeaderAction')).toBeInTheDocument();
  });
});
