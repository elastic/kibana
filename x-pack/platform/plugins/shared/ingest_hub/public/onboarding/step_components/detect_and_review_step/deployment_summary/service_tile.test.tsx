/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ServiceTile } from './service_tile';
import type { AwsServiceMatrixEntry } from '../../../aws_service_matrix';
import type { ServiceChipState } from '../../../onboarding_flow_context';

const ENTRY = {
  id: 'config',
  name: 'AWS Config',
  packageName: 'aws',
  dataStreams: ['config'],
  category: 'security_identity_compliance',
  signalTypes: ['logs'],
  deploymentMethods: [{ method: 'managed_integration', preferred: true }],
  defaultEnabled: true,
  defaultEnabledInputs: [],
  showInUI: true,
} as unknown as AwsServiceMatrixEntry;

function renderTile(status: ServiceChipState) {
  return render(
    <I18nProvider>
      <ServiceTile
        name="AWS Config"
        status={status}
        entry={ENTRY}
        deploymentMethod="managed_integration"
      />
    </I18nProvider>
  );
}

describe('ServiceTile', () => {
  it('renders the service name', () => {
    renderTile('receiving');
    expect(screen.getByText('AWS Config')).toBeInTheDocument();
  });

  describe('leading indicator', () => {
    it.each<ServiceChipState>(['instantiating', 'detecting'])(
      'shows a spinner while %s',
      (status) => {
        const { container } = renderTile(status);
        expect(screen.getByTestId('serviceTile-spinner')).toBeInTheDocument();
        // No terminal-state icon alongside the spinner.
        expect(container.querySelector('[data-euiicon-type="checkCircle"]')).toBeNull();
      }
    );

    it('shows a success icon once receiving', () => {
      const { container } = renderTile('receiving');
      expect(screen.queryByTestId('serviceTile-spinner')).not.toBeInTheDocument();
      expect(container.querySelector('[data-euiicon-type="checkCircle"]')).not.toBeNull();
    });

    it('does not show a success icon on error', () => {
      const { container } = renderTile('error');
      expect(screen.queryByTestId('serviceTile-spinner')).not.toBeInTheDocument();
      expect(container.querySelector('[data-euiicon-type="checkCircle"]')).toBeNull();
      expect(container.querySelector('[data-euiicon-type="errorFilled"]')).not.toBeNull();
    });

    it('does not show a success icon on timeout', () => {
      const { container } = renderTile('timeout');
      expect(screen.queryByTestId('serviceTile-spinner')).not.toBeInTheDocument();
      expect(container.querySelector('[data-euiicon-type="checkCircle"]')).toBeNull();
      expect(container.querySelector('[data-euiicon-type="warning"]')).not.toBeNull();
    });
  });

  it('renders exactly one loading indicator while pending', () => {
    const { container } = renderTile('detecting');
    expect(container.querySelectorAll('.euiLoadingSpinner')).toHaveLength(1);
  });
});
