/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { EuiThemeProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import { ManagedPolicyBadge } from './managed_policy_badge';

describe('ManagedPolicyBadge', () => {
  const renderWithTheme = (node: React.ReactElement) => render(node, { wrapper: EuiThemeProvider });

  it('renders the "Managed" label under a default test subject', () => {
    renderWithTheme(<ManagedPolicyBadge />);

    const badge = screen.getByTestId('managedPolicyBadge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Managed');
  });

  it('uses a custom test subject when provided', () => {
    renderWithTheme(<ManagedPolicyBadge data-test-subj="customBadge" />);

    expect(screen.getByTestId('customBadge')).toBeInTheDocument();
    expect(screen.queryByTestId('managedPolicyBadge')).not.toBeInTheDocument();
  });

  it('is not disabled by default', () => {
    renderWithTheme(<ManagedPolicyBadge />);

    expect(screen.getByTestId('managedPolicyBadge').className).not.toContain('euiBadge-disabled');
  });

  it('renders in a disabled state when isDisabled is true', () => {
    renderWithTheme(<ManagedPolicyBadge isDisabled />);

    expect(screen.getByTestId('managedPolicyBadge').className).toContain('euiBadge-disabled');
  });
});
