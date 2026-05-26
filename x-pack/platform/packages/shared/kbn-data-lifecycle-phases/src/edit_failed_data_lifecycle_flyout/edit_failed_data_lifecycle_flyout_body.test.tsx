/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { EuiFieldText, EuiThemeProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import { EditFailedDataLifecycleFlyoutBody } from './edit_failed_data_lifecycle_flyout_body';

describe('EditFailedDataLifecycleFlyoutBody', () => {
  const renderWithTheme = (node: React.ReactElement) =>
    render(node, {
      wrapper: EuiThemeProvider,
    });

  it('disables the failure store checkbox when inheriting lifecycle', () => {
    renderWithTheme(
      <EditFailedDataLifecycleFlyoutBody
        inherit={{
          value: true,
          onChange: () => {},
          label: 'Inherit lifecycle from index template',
        }}
        failureStore={{ value: true, onChange: () => {} }}
      />
    );

    expect(screen.getByTestId('editFailedDataLifecycle-enableFailureStoreCheckbox')).toBeDisabled();
  });

  it('does not render retention content when omitted', () => {
    renderWithTheme(
      <EditFailedDataLifecycleFlyoutBody failureStore={{ value: true, onChange: () => {} }} />
    );

    expect(screen.queryByTestId('failedRetentionInput')).not.toBeInTheDocument();
  });

  it('hides retention content when failure store is disabled', () => {
    renderWithTheme(
      <EditFailedDataLifecycleFlyoutBody
        failureStore={{ value: false, onChange: () => {} }}
        retentionContent={<EuiFieldText data-test-subj="failedRetentionInput" defaultValue="60d" />}
      />
    );

    expect(screen.queryByTestId('failedRetentionInput')).not.toBeInTheDocument();
  });

  it('renders retention content when provided', () => {
    renderWithTheme(
      <EditFailedDataLifecycleFlyoutBody
        failureStore={{ value: true, onChange: () => {} }}
        retentionContent={<EuiFieldText data-test-subj="failedRetentionInput" defaultValue="60d" />}
      />
    );

    expect(screen.getByTestId('failedRetentionInput')).toBeInTheDocument();
  });

  it('keeps showing the inherited retention content while inheriting, even if content changes', () => {
    const { rerender } = renderWithTheme(
      <EditFailedDataLifecycleFlyoutBody
        inherit={{ value: true, onChange: () => {}, label: 'Inherit lifecycle' }}
        failureStore={{ value: true, onChange: () => {} }}
        retentionContent={<div data-test-subj="failedRetentionPinned">inherited</div>}
      />
    );

    rerender(
      <EditFailedDataLifecycleFlyoutBody
        inherit={{ value: true, onChange: () => {}, label: 'Inherit lifecycle' }}
        failureStore={{ value: true, onChange: () => {} }}
        retentionContent={<div data-test-subj="failedRetentionPinned">local</div>}
      />
    );

    expect(screen.getByTestId('failedRetentionPinned')).toHaveTextContent('inherited');
  });

  it('restores the pinned inherited failure store value when re-enabling inherit', () => {
    const { rerender } = renderWithTheme(
      <EditFailedDataLifecycleFlyoutBody
        inherit={{ value: true, onChange: () => {}, label: 'Inherit lifecycle' }}
        failureStore={{ value: true, onChange: () => {} }}
      />
    );

    // Consumer toggles inherit off and changes local failure store value.
    rerender(
      <EditFailedDataLifecycleFlyoutBody
        inherit={{ value: false, onChange: () => {}, label: 'Inherit lifecycle' }}
        failureStore={{ value: false, onChange: () => {} }}
      />
    );

    // Re-enable inherit: UI should still reflect the pinned inherited value (true).
    rerender(
      <EditFailedDataLifecycleFlyoutBody
        inherit={{ value: true, onChange: () => {}, label: 'Inherit lifecycle' }}
        failureStore={{ value: false, onChange: () => {} }}
      />
    );

    expect(screen.getByTestId('editFailedDataLifecycle-enableFailureStoreCheckbox')).toBeChecked();
  });
});
