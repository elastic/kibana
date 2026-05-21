/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QueryClientProvider } from '@kbn/react-query';
import { DASHBOARD_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import { createTestQueryClient, createMockServices } from '../../test_utils';
import { RuleFormProvider } from '../../form/contexts';
import type { ComposeFormValues } from './compose_form_types';
import { ComposeRelatedDashboardsField } from './compose_artifact_fields';

jest.mock('@kbn/dashboards-selector', () => ({
  DashboardsSelector: ({
    dashboardsFormData,
    onChange,
    placeholder,
  }: {
    dashboardsFormData: Array<{ id: string }>;
    onChange: (selected: Array<{ value: string; label: string }>) => void;
    placeholder?: string;
  }) => (
    <div>
      <input
        data-test-subj="dashboardsSelector"
        placeholder={placeholder}
        readOnly
        value={dashboardsFormData.map((dashboard) => dashboard.id).join(',')}
      />
      <button
        type="button"
        data-test-subj="selectDashboard"
        onClick={() => onChange([{ value: 'dashboard-123', label: 'Dashboard 123' }])}
      >
        Select dashboard
      </button>
      <button type="button" data-test-subj="clearDashboard" onClick={() => onChange([])}>
        Clear dashboard
      </button>
    </div>
  ),
}));

const BASE_COMPOSE_VALUES: ComposeFormValues = {
  kind: 'alert',
  metadata: { name: 'Test rule', enabled: true },
  timeField: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  query: { format: 'standalone', breach: '' },
  stateTransitionAlertDelayMode: 'immediate',
  stateTransitionRecoveryDelayMode: 'immediate',
  artifacts: [],
};

const ArtifactValueSpy = () => {
  const { watch } = useFormContext<ComposeFormValues>();
  return <div data-test-subj="artifactValueSpy">{JSON.stringify(watch('artifacts') ?? [])}</div>;
};

const createComposeFormWrapper = (defaultValues: ComposeFormValues = BASE_COMPOSE_VALUES) => {
  const queryClient = createTestQueryClient();
  const services = createMockServices();

  return ({ children }: { children: React.ReactNode }) => {
    const form = useForm<ComposeFormValues>({ defaultValues });
    return (
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <FormProvider {...form}>
            <RuleFormProvider services={services} meta={{ layout: 'flyout' }}>
              {children}
            </RuleFormProvider>
          </FormProvider>
        </QueryClientProvider>
      </IntlProvider>
    );
  };
};

describe('ComposeRelatedDashboardsField', () => {
  it('renders the related dashboards selector', () => {
    render(<ComposeRelatedDashboardsField />, { wrapper: createComposeFormWrapper() });

    expect(screen.getByText('Related dashboards')).toBeInTheDocument();
    expect(screen.getByTestId('dashboardsSelector')).toHaveAttribute(
      'placeholder',
      'Link related dashboards for investigation'
    );
  });

  it('writes selected dashboards to artifacts', async () => {
    const user = userEvent.setup();

    render(
      <>
        <ComposeRelatedDashboardsField />
        <ArtifactValueSpy />
      </>,
      { wrapper: createComposeFormWrapper() }
    );

    await user.click(screen.getByTestId('selectDashboard'));

    expect(screen.getByTestId('artifactValueSpy')).toHaveTextContent(DASHBOARD_ARTIFACT_TYPE);
    expect(screen.getByTestId('artifactValueSpy')).toHaveTextContent('dashboard-123');
  });

  it('removes dashboard artifacts when the selection is cleared', async () => {
    const user = userEvent.setup();

    render(
      <>
        <ComposeRelatedDashboardsField />
        <ArtifactValueSpy />
      </>,
      {
        wrapper: createComposeFormWrapper({
          ...BASE_COMPOSE_VALUES,
          artifacts: [
            { id: 'dashboard-id', type: DASHBOARD_ARTIFACT_TYPE, value: 'dashboard-123' },
          ],
        }),
      }
    );

    await user.click(screen.getByTestId('clearDashboard'));

    expect(screen.getByTestId('artifactValueSpy')).toHaveTextContent('[]');
  });
});
