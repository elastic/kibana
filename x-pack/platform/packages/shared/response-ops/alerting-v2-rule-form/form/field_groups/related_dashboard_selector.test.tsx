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
import { createMockServices, createTestQueryClient } from '../../test_utils';
import { RuleFormProvider, type RuleFormServices } from '../contexts';
import type { ComposeFormValues } from '../../flyout/compose_discover/compose_form_types';
import { RelatedDashboardSelector } from './related_dashboard_selector';

const BASE_COMPOSE_VALUES: ComposeFormValues = {
  kind: 'alert',
  metadata: { name: 'Test rule', enabled: true },
  timeField: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  query: { format: 'standalone', breach: '' },
  stateTransitionAlertDelayMode: 'immediate',
  stateTransitionRecoveryDelayMode: 'immediate',
  artifacts: [],
  runbookArtifacts: [],
  dashboardArtifacts: [],
};

const DASHBOARD_ID = 'dashboard-123';
const DASHBOARD_TITLE = 'Dashboard 123';
const MISSING_DASHBOARD_ID = 'missing-dashboard';

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
  return (
    <div data-test-subj="artifactValueSpy">{JSON.stringify(watch('dashboardArtifacts') ?? [])}</div>
  );
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

describe('RelatedDashboardSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the related dashboards selector', () => {
    render(<RelatedDashboardSelector />, { wrapper: createComposeFormWrapper() });

    expect(screen.getByText('Related dashboards')).toBeTruthy();
    expect(screen.getByPlaceholderText('Link related dashboards for investigation')).toBeTruthy();
  });

  it('writes selected dashboards to artifacts', async () => {
    render(
      <>
        <RelatedDashboardSelector />
        <ArtifactValueSpy />
      </>,
      { wrapper: createComposeFormWrapper() }
    );

    const searchInput = screen.getByPlaceholderText('Link related dashboards for investigation');
    fireEvent.focus(searchInput);

    await waitFor(() => {
      expect(screen.getByText(DASHBOARD_TITLE)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('option', { name: DASHBOARD_TITLE }));

    await waitFor(() => {
      expect(screen.getByTestId('artifactValueSpy').textContent).toContain(DASHBOARD_ARTIFACT_TYPE);
      expect(screen.getByTestId('artifactValueSpy').textContent).toContain(DASHBOARD_ID);
    });
  });

  it('debounces dashboard searches after the initial load', async () => {
    render(<RelatedDashboardSelector />, { wrapper: createComposeFormWrapper() });

    const searchInput = screen.getByPlaceholderText('Link related dashboards for investigation');
    fireEvent.focus(searchInput);

    await waitFor(() => {
      expect(mockSearchExecute).toHaveBeenCalledTimes(1);
    });

    mockSearchExecute.mockClear();
    await userEvent.type(searchInput, 'error');

    await waitFor(() => {
      expect(mockSearchExecute).toHaveBeenCalled();
      expect(mockSearchExecute).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: {
            query: 'error',
            per_page: 100,
          },
        })
      );
    });
  });

  it('removes dashboard artifacts when the selection is cleared', async () => {
    render(
      <>
        <RelatedDashboardSelector />
        <ArtifactValueSpy />
      </>,
      {
        wrapper: createComposeFormWrapper({
          ...BASE_COMPOSE_VALUES,
          dashboardArtifacts: [
            { id: 'dashboard-id', type: DASHBOARD_ARTIFACT_TYPE, value: DASHBOARD_ID },
          ],
        }),
      }
    );

    await waitFor(() => {
      expect(screen.getByText(DASHBOARD_TITLE)).toBeTruthy();
    });

    const selectedOption = screen.getByText(DASHBOARD_TITLE);
    await userEvent.type(selectedOption, '{backspace}');

    await waitFor(() => {
      expect(screen.getByTestId('artifactValueSpy').textContent).toContain('[]');
    });
  });

  it('prunes stale dashboard artifacts when dashboard titles cannot be loaded', async () => {
    render(
      <>
        <RelatedDashboardSelector />
        <ArtifactValueSpy />
      </>,
      {
        wrapper: createComposeFormWrapper({
          ...BASE_COMPOSE_VALUES,
          dashboardArtifacts: [
            { id: 'dashboard-id', type: DASHBOARD_ARTIFACT_TYPE, value: DASHBOARD_ID },
            {
              id: 'missing-dashboard-id',
              type: DASHBOARD_ARTIFACT_TYPE,
              value: MISSING_DASHBOARD_ID,
            },
          ],
        }),
      }
    );

    await waitFor(() => {
      expect(screen.getByText(DASHBOARD_TITLE)).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByTestId('artifactValueSpy').textContent).toContain(DASHBOARD_ID);
      expect(screen.getByTestId('artifactValueSpy').textContent).not.toContain(
        MISSING_DASHBOARD_ID
      );
    });
  });

  it('does not render when uiActions is unavailable', () => {
    render(<RelatedDashboardSelector />, {
      wrapper: createComposeFormWrapper(BASE_COMPOSE_VALUES, {
        ...createMockServices(),
        uiActions: undefined,
      }),
    });

    expect(screen.queryByText('Related dashboards')).toBeNull();
  });
});
