/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  STATS_FIXTURE_RESPONSES,
  type StatsFixtureScenario,
} from '../../../services/unit_stats_client/fixture_unit_stats_client';
import {
  EMPTY_DESTINATION_FAILED,
  mapFailedRequest,
  mapStatsResponse,
} from '../../../services/unit_stats_client/map_stats_response';
import type {
  DestinationFailedView,
  DestinationStatsView,
  MappedComponentStats,
} from '../../../services/unit_stats_client/types';
import { DestinationFailuresView } from './destination_failures_section';

// The chart needs the services of the page, and has tests of its own.
jest.mock('./delivery_chart', () => ({
  DeliveryChart: () => <div data-test-subj="streamsDestinationDeliveryChart" />,
}));
// The picker is the page's own, and reads its time filter and route.
jest.mock('../../stream_detail_overview/overview_time_filter', () => ({
  OverviewTimeFilter: () => <div data-test-subj="timePicker" />,
}));

type Entry = MappedComponentStats<DestinationStatsView>;

const fixtureEntry = (scenario: StatsFixtureScenario, destinationId: string): Entry =>
  mapStatsResponse(STATS_FIXTURE_RESPONSES[scenario], [{ kind: 'destination', id: destinationId }])
    .destinations[destinationId];

const entryWith = (failed: DestinationFailedView): Entry => ({
  status: 'ready',
  stats: {
    eventsRate: 4.2,
    eventsTotal: 3780,
    latencyAverage: 0.17,
    series: { bucketMs: 60_000, points: [] },
    failed,
  },
});

const noFailures: DestinationFailedView = {
  ...EMPTY_DESTINATION_FAILED,
  authentication: { rate: 0, unit: '{item}', percentage: 0, breakdown: [] },
  authorization: { rate: 0, unit: '{item}', percentage: 0, breakdown: [] },
};

const renderView = (props: Partial<React.ComponentProps<typeof DestinationFailuresView>>) =>
  render(
    <I18nProvider>
      <DestinationFailuresView
        destinationType="elasticsearch"
        loading={false}
        showTimePicker={false}
        value={undefined}
        {...props}
      />
    </I18nProvider>
  );

const SECTION = 'streamsDestinationFailuresSection';
const isShown = (testId: string) => screen.queryByTestId(testId) !== null;

describe('DestinationFailuresView', () => {
  describe('a destination with failures', () => {
    beforeEach(() => renderView({ value: fixtureEntry('authFailures', 'es-dev') }));

    it('says what the figures are a share of, once, for the selected range', () => {
      expect(
        within(screen.getByTestId(SECTION)).getByText('Of events for the selected time range')
      ).toBeInTheDocument();
    });

    it('shows each class with its percentage and its rate', () => {
      const authentication = screen.getByTestId('streamsDestinationFailuresAuthentication');
      const authorization = screen.getByTestId('streamsDestinationFailuresAuthorization');

      expect(authentication.textContent).toContain('12%');
      expect(authentication.textContent).toContain('0.50/s');
      expect(authorization.textContent).toContain('45%');
      expect(authorization.textContent).toContain('1.9/s');
    });

    it('shows the delivery chart', () => {
      expect(isShown('streamsDestinationDeliveryChart')).toBe(true);
    });

    it('shows the causes of the class that has them, and no table for one that has none', () => {
      const causes = screen.getByTestId('streamsDestinationFailuresAuthorizationCauses');

      [
        'logs-generic.otel-default',
        'logs-nginx.access-default',
        'metrics-system.cpu-default',
      ].forEach((name) => expect(within(causes).getByText(name)).toBeInTheDocument());
      expect(within(causes).getAllByText('security_exception')).toHaveLength(3);
      // What an Elasticsearch destination reports as the collection is the name of an index.
      expect(
        within(causes)
          .getAllByRole('columnheader')
          .map(({ textContent }) => textContent)
      ).toEqual(['Index name', 'Error type', 'Percentage', 'Rate']);
      expect(isShown('streamsDestinationFailuresAuthenticationCauses')).toBe(false);
    });
  });

  it('shows the stats and no chart for a destination that has no delivery series', () => {
    renderView({
      value: entryWith({
        ...EMPTY_DESTINATION_FAILED,
        authentication: { rate: 0.5, unit: '{item}', percentage: 11.9, breakdown: [] },
      }),
    });

    expect(isShown('streamsDestinationFailuresAuthentication')).toBe(true);
    expect(isShown('streamsDestinationDeliveryChart')).toBe(false);
  });

  it('names upload attempts for a destination that counts them, and shows only the class with failures', () => {
    renderView({ value: fixtureEntry('s3Failures', 's3-test') });

    expect(screen.getByText('Of upload attempts for the selected time range')).toBeInTheDocument();
    expect(screen.getByTestId('streamsDestinationFailuresAuthentication').textContent).toContain(
      '0.44/s'
    );
    expect(isShown('streamsDestinationFailuresAuthorization')).toBe(false);
    const causes = screen.getByTestId('streamsDestinationFailuresAuthenticationCauses');
    expect(within(causes).getByText('SignatureDoesNotMatch')).toBeInTheDocument();
  });

  it('says there are none when the classes report 0', () => {
    renderView({ value: entryWith(noFailures) });

    expect(isShown('streamsDestinationFailuresNone')).toBe(true);
    expect(isShown('streamsDestinationDeliveryChart')).toBe(false);
    // A report of 0 is data, so the subtitle can name what the figures are a share of.
    expect(screen.getByText('Of events for the selected time range')).toBeInTheDocument();
  });

  it('says it has no data when the classes report nothing', () => {
    renderView({ value: entryWith(EMPTY_DESTINATION_FAILED) });

    expect(isShown('streamsDestinationFailuresNoData')).toBe(true);
    expect(isShown('streamsDestinationFailuresNone')).toBe(false);
  });

  it('warns about a part that could not load, and does not say there is no data for it', () => {
    renderView({ value: fixtureEntry('partialFailure', 'es-dev') });

    const warning = screen.getByTestId('streamsDestinationFailuresPartialError');
    expect(warning.textContent).toContain('Some stats could not be loaded');
    expect(warning.textContent).toContain('The stats query failed.');
    expect(isShown('streamsDestinationFailuresNoData')).toBe(false);
  });

  it('keeps the values of a part that loaded next to the warning', () => {
    const partial = entryWith({
      ...EMPTY_DESTINATION_FAILED,
      authentication: { rate: 0.5, unit: '{item}', percentage: 11.9, breakdown: [] },
    });
    renderView({
      value: { ...partial, error: { code: 'error', reason: 'The stats query failed.' } },
    });

    expect(isShown('streamsDestinationFailuresPartialError')).toBe(true);
    expect(screen.getByTestId('streamsDestinationFailuresAuthentication').textContent).toContain(
      '12%'
    );
  });

  it('shows a spinner while it loads for the first time', () => {
    renderView({ loading: true });

    expect(isShown('streamsDestinationFailuresLoading')).toBe(true);
  });

  it('keeps the values while it loads again', () => {
    renderView({ loading: true, value: fixtureEntry('authFailures', 'es-dev') });

    expect(isShown('streamsDestinationFailuresLoading')).toBe(false);
    expect(isShown('streamsDestinationFailuresAuthentication')).toBe(true);
  });

  it('shows the error of a request that failed as a whole', () => {
    renderView({ error: new Error('Service Unavailable') });

    const error = screen.getByTestId('streamsDestinationFailuresError');
    expect(error.textContent).toContain('Could not load delivery failures');
    expect(error.textContent).toContain('Service Unavailable');
  });

  it('shows the reason of a destination whose stats failed', () => {
    renderView({
      value: mapFailedRequest([{ kind: 'destination', id: 'es-dev' }], 'Unavailable').destinations[
        'es-dev'
      ],
    });

    expect(screen.getByTestId('streamsDestinationFailuresError').textContent).toContain(
      'Unavailable'
    );
  });

  describe('the time picker', () => {
    it('is there when asked, in every state, so that the range can always be changed', () => {
      renderView({ showTimePicker: true, value: entryWith(EMPTY_DESTINATION_FAILED) });
      expect(isShown('timePicker')).toBe(true);
    });

    it('is not there otherwise', () => {
      renderView({ value: entryWith(EMPTY_DESTINATION_FAILED) });
      expect(isShown('timePicker')).toBe(false);
    });
  });
});
