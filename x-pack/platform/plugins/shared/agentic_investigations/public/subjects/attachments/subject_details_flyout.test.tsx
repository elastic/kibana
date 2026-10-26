/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fetchClassicAlertById } from '@kbn/alerting-v2-episodes-ui/classic_alerts/apis/fetch_classic_alert_by_id';
import type { SubjectServices } from './subject_services';
import { SubjectDetailsFlyout } from './subject_details_flyout';

jest.mock('@kbn/alerting-v2-episodes-ui/classic_alerts/apis/fetch_classic_alert_by_id', () => ({
  fetchClassicAlertById: jest.fn(),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/components/details/details_flyout', () => ({
  AlertEpisodeDetailsFlyout: ({ episodeId }: { episodeId: string }) => (
    <div data-test-subj="episodeFlyoutStub">{episodeId}</div>
  ),
}));

const fetchAlert = fetchClassicAlertById as jest.MockedFunction<typeof fetchClassicAlertById>;

const present = {} as never;

const episodeServices: SubjectServices = {
  http: present,
  uiSettings: present,
  userProfile: present,
  notifications: present,
  charts: present,
  data: present,
  dataViews: present,
  expressions: present,
  spaces: present,
  unifiedDocViewer: present,
};

const renderFlyout = (props: Partial<React.ComponentProps<typeof SubjectDetailsFlyout>> = {}) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <SubjectDetailsFlyout
          alertId="alert-1"
          onClose={jest.fn()}
          services={{ http: present }}
          {...props}
        />
      </I18nProvider>
    </EuiProvider>
  );

describe('SubjectDetailsFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a classic alert in a flyout, and opens its details page in place', async () => {
    fetchAlert.mockResolvedValue({
      'kibana.alert.rule.name': ['High latency'],
      'kibana.alert.status': ['active'],
      'kibana.alert.reason': ['p99 above 500 ms'],
      'kibana.alert.duration.us': [120_000_000],
    } as never);

    const navigateToUrl = jest.fn();
    renderFlyout({
      detailsHref: '/app/observability/alerts/alert-1',
      services: { http: present, application: { navigateToUrl } as never },
    });

    await waitFor(() =>
      expect(screen.getByTestId('investigationSubjectAlertFlyoutTitle')).toHaveTextContent(
        'High latency'
      )
    );
    const overview = screen.getByTestId('investigationSubjectAlertFlyoutOverview');
    expect(overview).toHaveTextContent('p99 above 500 ms');
    expect(overview).toHaveTextContent('120,000 ms');
    fireEvent.click(screen.getByTestId('investigationSubjectAlertFlyoutViewDetails'));
    expect(navigateToUrl).toHaveBeenCalledWith('/app/observability/alerts/alert-1');
  });

  it('shows an error when the alert cannot be loaded', async () => {
    fetchAlert.mockRejectedValue(new Error('Classic alert not found: alert-1'));

    renderFlyout();

    await waitFor(() =>
      expect(screen.getByTestId('investigationSubjectAlertFlyoutError')).toBeInTheDocument()
    );
  });

  it('shows an alerting v2 alert in the shared episode flyout', () => {
    renderFlyout({ alertId: 'episode-1', alertVersion: 'v2', services: episodeServices });

    expect(screen.getByTestId('episodeFlyoutStub')).toHaveTextContent('episode-1');
    expect(fetchAlert).not.toHaveBeenCalled();
  });

  it('renders nothing for a v2 alert when an episode flyout service is missing', () => {
    const { container } = renderFlyout({
      alertId: 'episode-1',
      alertVersion: 'v2',
      services: { ...episodeServices, spaces: undefined },
    });

    expect(container).toBeEmptyDOMElement();
  });
});
