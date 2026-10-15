/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { KiFormattedDate } from './ki_formatted_date';

const renderDate = (value: string, className?: string) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <KiFormattedDate value={value} className={className} />
      </EuiProvider>
    </I18nProvider>
  );

describe('KiFormattedDate', () => {
  it('renders relative date for valid ISO values', () => {
    const { container } = renderDate('2026-01-15T12:00:00.000Z');
    expect(container.querySelector('span[tabindex="0"]')).toBeInTheDocument();
  });

  it('falls back to the raw value for invalid dates', () => {
    renderDate('not-a-date', 'ki-date-fallback');
    const fallback = screen.getByText('not-a-date');
    expect(fallback).toHaveClass('ki-date-fallback');
    expect(fallback).not.toHaveAttribute('tabindex');
  });
});
