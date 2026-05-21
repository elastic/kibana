/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QueryClientProvider } from '@kbn/react-query';
import { DASHBOARD_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { createTestQueryClient, createMockServices } from '../../test_utils';
import { RuleFormProvider, type RuleFormServices } from '../../form/contexts';
import type { ComposeFormValues } from './compose_form_types';
import { ComposeRelatedDashboardsField } from './compose_artifact_fields';

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

const DASHBOARD_ID = 'dashboard-123';
const DASHBOARD_TITLE = 'Dashboard 123';

interface Dashboard {
  id: string;
  title: string;
}

interface SearchDashboardsContext {
  onResults: (dashboards: Dashboard[]) => void;
}

interface GetDashboardsByIdContext {
  ids: string[];
  onResults: (dashboards: Dashboard[]) => void;
}

const mockSearchExecute = jest.fn((context: SearchDashboardsContext) => {
  context.onResults([{ id: DASHBOARD_ID, title: DASHBOARD_TITLE }]);
});

const mockGetByIdExecute = jest.fn((context: GetDashboardsByIdContext) => {
  context.onResults(
    context.ids
      .map((id) => (id === DASHBOARD_ID ? { id: DASHBOARD_ID, title: DASHBOARD_TITLE } : null))
      .filter((dashboard): dashboard is Dashboard => Boolean(dashboard))
  );
});

const mockUiActions = {
  getAction: jest.fn((actionId: string) => {
    if (actionId === 'getDashboardsByIdsAction') {
      return Promise.resolve({ execute: mockGetByIdExecute });
    }

    return Promise.resolve({ execute: mockSearchExecute });
  }),
} as unknown as UiActionsStart;

const ArtifactValueSpy = () => {
  const { watch } = useFormContext<ComposeFormValues>();
  return <div data-test-subj="artifactValueSpy">{JSON.stringify(watch('artifacts') ?? [])}</div>;
};

const createComposeFormWrapper = (
  defaultValues: ComposeFormValues = BASE_COMPOSE_VALUES,
  services: RuleFormServices = { ...createMockServices(), uiActions: mockUiActions }
) => {
  const queryClient = createTestQueryClient();

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the related dashboards selector', () => {
    render(<ComposeRelatedDashboardsField />, { wrapper: createComposeFormWrapper() });

    expect(screen.getByText('Related dashboards')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Link related dashboards for investigation')
    ).toBeInTheDocument();
  });

  it('writes selected dashboards to artifacts', async () => {
    render(
      <>
        <ComposeRelatedDashboardsField />
        <ArtifactValueSpy />
      </>,
      { wrapper: createComposeFormWrapper() }
    );

    const searchInput = screen.getByPlaceholderText('Link related dashboards for investigation');
    fireEvent.focus(searchInput);

    await waitFor(() => {
      expect(screen.getByText(DASHBOARD_TITLE)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText(DASHBOARD_TITLE));

    expect(screen.getByTestId('artifactValueSpy')).toHaveTextContent(DASHBOARD_ARTIFACT_TYPE);
    expect(screen.getByTestId('artifactValueSpy')).toHaveTextContent(DASHBOARD_ID);
  });

  it('removes dashboard artifacts when the selection is cleared', async () => {
    render(
      <>
        <ComposeRelatedDashboardsField />
        <ArtifactValueSpy />
      </>,
      {
        wrapper: createComposeFormWrapper({
          ...BASE_COMPOSE_VALUES,
          artifacts: [{ id: 'dashboard-id', type: DASHBOARD_ARTIFACT_TYPE, value: DASHBOARD_ID }],
        }),
      }
    );

    await waitFor(() => {
      expect(screen.getByText(DASHBOARD_TITLE)).toBeInTheDocument();
    });

    const selectedOption = screen.getByText(DASHBOARD_TITLE);
    await userEvent.type(selectedOption, '{backspace}');

    await waitFor(() => {
      expect(screen.getByTestId('artifactValueSpy')).toHaveTextContent('[]');
    });
  });

  it('does not render when uiActions is unavailable', () => {
    render(<ComposeRelatedDashboardsField />, {
      wrapper: createComposeFormWrapper(BASE_COMPOSE_VALUES, {
        ...createMockServices(),
        uiActions: undefined,
      }),
    });

    expect(screen.queryByText('Related dashboards')).not.toBeInTheDocument();
  });
});
