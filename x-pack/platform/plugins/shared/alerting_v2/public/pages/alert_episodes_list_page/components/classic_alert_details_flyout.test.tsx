/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { HttpStart } from '@kbn/core-http-browser';
import { fetchClassicAlertById } from '@kbn/alerting-v2-episodes-ui/classic_alerts/apis/fetch_classic_alert_by_id';
import { ClassicAlertDetailsFlyout } from './classic_alert_details_flyout';

jest.mock('@kbn/alerting-v2-episodes-ui/classic_alerts/apis/fetch_classic_alert_by_id');

const mockFetchClassicAlertById = jest.mocked(fetchClassicAlertById);

const services = {
  http: {
    basePath: { prepend: (path: string) => `/base${path}` },
  } as unknown as HttpStart,
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const renderFlyout = (props?: Partial<React.ComponentProps<typeof ClassicAlertDetailsFlyout>>) =>
  render(
    <ClassicAlertDetailsFlyout
      alertId="alert-1"
      onClose={jest.fn()}
      services={services}
      {...props}
    />,
    { wrapper: createWrapper() }
  );

describe('ClassicAlertDetailsFlyout', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading spinner while the classic alert is being fetched', () => {
    mockFetchClassicAlertById.mockReturnValue(new Promise(() => {}));

    renderFlyout();

    expect(screen.getByTestId('classicAlertEpisodeDetailsLoading')).toBeInTheDocument();
  });

  it('renders the overview and fields tabs when the alert loads', async () => {
    mockFetchClassicAlertById.mockResolvedValue({
      _index: '.internal.alerts-observability.apm.alerts-default-000001',
      _id: 'alert-1',
      'kibana.alert.status': 'active',
      'kibana.alert.rule.name': 'CPU usage',
      'kibana.alert.rule.rule_type_id': 'apm.error_rate',
      'kibana.alert.severity': 'critical',
      'kibana.alert.reason': 'CPU is high',
      'kibana.alert.duration.us': 120_000_000,
      'kibana.alert.rule.tags': ['prod', 'cpu'],
    });

    renderFlyout();

    await waitFor(() => {
      expect(screen.getByTestId('classicAlertEpisodeDetailsTabs')).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: 'CPU usage' })).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('critical')).toBeInTheDocument();
    expect(screen.getByText('CPU is high')).toBeInTheDocument();
    expect(screen.getByText('2 min')).toBeInTheDocument();
    expect(screen.getByText('prod, cpu')).toBeInTheDocument();

    expect(screen.getByTestId('classicAlertEpisodeFieldsTab')).toBeInTheDocument();

    const detailsButton = screen.getByTestId('classicAlertEpisodeDetailsViewDetailsButton');
    expect(detailsButton).toHaveAttribute('href', '/base/app/observability/alerts/alert-1');
    expect(detailsButton).toHaveTextContent('View details');
  });

  it('omits the "View details" button for non-observability (stack) alerts', async () => {
    mockFetchClassicAlertById.mockResolvedValue({
      _index: '.internal.alerts-stack.alerts-default-000001',
      _id: 'alert-1',
      'kibana.alert.status': 'active',
      'kibana.alert.rule.name': 'Stack rule',
      'kibana.alert.rule.rule_type_id': '.index-threshold',
    });

    renderFlyout();

    await waitFor(() => {
      expect(screen.getByTestId('classicAlertEpisodeDetailsTabs')).toBeInTheDocument();
    });

    expect(
      screen.queryByTestId('classicAlertEpisodeDetailsViewDetailsButton')
    ).not.toBeInTheDocument();
  });

  it('renders an error state when the fetch fails', async () => {
    mockFetchClassicAlertById.mockRejectedValue(new Error('not found'));

    renderFlyout();

    await waitFor(() => {
      expect(screen.getByTestId('classicAlertEpisodeDetailsError')).toBeInTheDocument();
    });
  });
});
