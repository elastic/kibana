/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ServiceStatusIndicator } from './service_status_indicator';
import type { ServiceChipState } from '../../../onboarding_flow_context';

function renderIndicator(status: ServiceChipState) {
  return render(
    <I18nProvider>
      <ServiceStatusIndicator status={status} />
    </I18nProvider>
  );
}

describe('ServiceStatusIndicator', () => {
  it('shows label for instantiating', () => {
    renderIndicator('instantiating');
    expect(screen.getByText('Setting up...')).toBeInTheDocument();
  });

  it('shows label for detecting', () => {
    renderIndicator('detecting');
    expect(screen.getByText('Detecting data...')).toBeInTheDocument();
  });

  it('does not render its own spinner — the tile owns the loading indicator', () => {
    const { container } = renderIndicator('detecting');
    expect(container.querySelector('.euiLoadingSpinner')).not.toBeInTheDocument();
  });

  it('shows success for receiving', () => {
    renderIndicator('receiving');
    expect(screen.getByText('Receiving data')).toBeInTheDocument();
  });

  it('shows warning for timeout', () => {
    renderIndicator('timeout');
    expect(screen.getByText('No data detected yet')).toBeInTheDocument();
  });

  it('shows danger for error', () => {
    renderIndicator('error');
    expect(screen.getByText('Deployment failed')).toBeInTheDocument();
  });

  it('has aria-live polite for screen reader announcements', () => {
    const { container } = renderIndicator('detecting');
    expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument();
  });
});
