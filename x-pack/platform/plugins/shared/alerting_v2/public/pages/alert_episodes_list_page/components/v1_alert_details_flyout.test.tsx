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
import { fetchV1AlertById } from '@kbn/alerting-v2-episodes-ui/apis/classic_alerts_api';
import { V1AlertDetailsFlyout } from './v1_alert_details_flyout';

jest.mock('@kbn/alerting-v2-episodes-ui/apis/classic_alerts_api');

const mockFetchV1AlertById = jest.mocked(fetchV1AlertById);

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

const renderFlyout = (props?: Partial<React.ComponentProps<typeof V1AlertDetailsFlyout>>) =>
  render(
    <V1AlertDetailsFlyout alertId="alert-1" onClose={jest.fn()} services={services} {...props} />,
    { wrapper: createWrapper() }
  );

describe('V1AlertDetailsFlyout', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading spinner while the classic alert is being fetched', () => {
    mockFetchV1AlertById.mockReturnValue(new Promise(() => {}));

    renderFlyout();

    expect(screen.getByTestId('alertEpisodeV1DetailsLoading')).toBeInTheDocument();
  });

  it('renders the overview and fields tabs when the alert loads', async () => {
    mockFetchV1AlertById.mockResolvedValue({
      _index: '.internal.alerts-observability.apm.alerts-default-000001',
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
      expect(screen.getByTestId('alertEpisodeV1DetailsTabs')).toBeInTheDocument();
    });

    // Title uses the fetched rule name.
    expect(screen.getByRole('heading', { name: 'CPU usage' })).toBeInTheDocument();
    // Overview values.
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('critical')).toBeInTheDocument();
    expect(screen.getByText('CPU is high')).toBeInTheDocument();
    // Duration is humanized from microseconds (120_000_000 us = 2 min).
    expect(screen.getByText('2 min')).toBeInTheDocument();
    // Tags joined.
    expect(screen.getByText('prod, cpu')).toBeInTheDocument();

    // Fields tab is available.
    expect(screen.getByTestId('alertEpisodeV1FieldsTab')).toBeInTheDocument();

    // The "View details" button links to the alert's own details page,
    // base-path prefixed.
    const detailsButton = screen.getByTestId('alertEpisodeV1DetailsViewDetailsButton');
    expect(detailsButton).toHaveAttribute('href', '/base/app/observability/alerts/alert-1');
    expect(detailsButton).toHaveTextContent('View details');
  });

  it('omits the "View details" button for non-observability (stack) alerts', async () => {
    mockFetchV1AlertById.mockResolvedValue({
      _index: '.internal.alerts-stack.alerts-default-000001',
      'kibana.alert.status': 'active',
      'kibana.alert.rule.name': 'Stack rule',
      'kibana.alert.rule.rule_type_id': '.index-threshold',
    });

    renderFlyout();

    await waitFor(() => {
      expect(screen.getByTestId('alertEpisodeV1DetailsTabs')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('alertEpisodeV1DetailsViewDetailsButton')).not.toBeInTheDocument();
  });

  it('renders an error state when the fetch fails', async () => {
    mockFetchV1AlertById.mockRejectedValue(new Error('not found'));

    renderFlyout();

    await waitFor(() => {
      expect(screen.getByTestId('alertEpisodeV1DetailsError')).toBeInTheDocument();
    });
  });
});
