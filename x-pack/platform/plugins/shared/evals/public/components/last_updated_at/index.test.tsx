/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { LastUpdatedAt } from '.';

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>{children}</I18nProvider>
);

describe('LastUpdatedAt', () => {
  it('renders "Updating..." text when isUpdating is true', () => {
    render(<LastUpdatedAt updatedAt={Date.now()} isUpdating />, { wrapper: Wrapper });

    expect(screen.getByText('Updating...')).toBeInTheDocument();
  });

  it('renders null when updatedAt is 0', () => {
    const { container } = render(<LastUpdatedAt updatedAt={0} />, { wrapper: Wrapper });

    expect(container.firstChild).toBeNull();
  });

  it('renders the "Updated" prefix with a relative time when updatedAt is valid', () => {
    const tenSecondsAgo = Date.now() - 10_000;
    render(<LastUpdatedAt updatedAt={tenSecondsAgo} />, { wrapper: Wrapper });

    expect(screen.getByTestId('lastUpdatedAt')).toBeInTheDocument();
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
  });

  it('has a tabIndex for keyboard accessibility', () => {
    const tenSecondsAgo = Date.now() - 10_000;
    render(<LastUpdatedAt updatedAt={tenSecondsAgo} />, { wrapper: Wrapper });

    const el = screen.getByTestId('lastUpdatedAt');
    expect(el).toHaveAttribute('tabindex', '0');
  });

  it('shows updating text instead of timestamp when updating', () => {
    render(<LastUpdatedAt updatedAt={Date.now()} isUpdating />, { wrapper: Wrapper });

    expect(screen.getByText('Updating...')).toBeInTheDocument();
    expect(screen.queryByTestId('lastUpdatedAt')).not.toBeInTheDocument();
  });
});
