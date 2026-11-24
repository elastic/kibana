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
  DeliverySeriesView,
  DestinationFailedView,
  DestinationStatsView,
  MappedComponentStats,
} from '../../../services/unit_stats_client/types';
import { DestinationDeliveryView } from './destination_delivery_section';

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

const deliveredSeries: DeliverySeriesView = {
  bucketMs: 60_000,
  unit: '{item}',
  window: { start: '2026-11-16T20:00:00.000Z', end: '2026-11-16T20:05:00.000Z' },
  points: [
    {
      start: '2026-11-16T20:00:00.000Z',
      total: 40,
      failed: 0,
      authentication: 0,
      authorization: 0,
    },
  ],
};

/** Half of the attempts failed, and none of the failures is in either class. */
const failedSeries: DeliverySeriesView = {
  ...deliveredSeries,
  points: [
    {
      start: '2026-11-16T20:00:00.000Z',
      total: 40,
      failed: 20,
      authentication: 0,
      authorization: 0,
    },
  ],
};

const totalFailures = { rate: 2.4, unit: '{item}', percentage: 50 };

const renderView = (props: Partial<React.ComponentProps<typeof DestinationDeliveryView>>) =>
  render(
    <I18nProvider>
      <DestinationDeliveryView
        destinationType="elasticsearch"
        panelRole="failures"
        loading={false}
        showTimePicker={false}
        value={undefined}
        {...props}
      />
    </I18nProvider>
  );

const SECTION = 'streamsDestinationDeliverySection';
const isShown = (testId: string) => screen.queryByTestId(testId) !== null;

describe('DestinationDeliveryView', () => {
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

  describe('when nothing failed', () => {
    const healthy = entryWith({ ...noFailures, series: deliveredSeries });

    it('says so, with no chart, in a failures panel, whatever its series', () => {
      renderView({ panelRole: 'failures', value: healthy });

      expect(screen.getByTestId('streamsDestinationFailuresNone').textContent).toBe(
        'No delivery failures in this time range.'
      );
      expect(isShown('streamsDestinationDeliveryChart')).toBe(false);
      // There are no failures to be a share of, so the subtitle names nothing.
      expect(screen.getByText('For the selected time range')).toBeInTheDocument();
    });

    it('shows what was delivered, and says nothing about failures, in a delivery panel', () => {
      renderView({ panelRole: 'delivery', value: healthy });

      expect(isShown('streamsDestinationDeliveryChart')).toBe(true);
      expect(isShown('streamsDestinationFailuresNone')).toBe(false);
      expect(isShown('streamsDestinationFailuresAuthentication')).toBe(false);
    });

    it('says that none failed in a delivery panel that has no series to show', () => {
      renderView({ panelRole: 'delivery', value: entryWith(noFailures) });

      expect(isShown('streamsDestinationDeliveryChart')).toBe(false);
      expect(isShown('streamsDestinationFailuresNone')).toBe(true);
    });

    it('says that none failed in a delivery panel whose series has no points', () => {
      renderView({
        panelRole: 'delivery',
        value: entryWith({ ...noFailures, series: { ...deliveredSeries, points: [] } }),
      });

      expect(isShown('streamsDestinationDeliveryChart')).toBe(false);
      expect(isShown('streamsDestinationFailuresNone')).toBe(true);
    });
  });

  it.each(['failures', 'delivery'] as const)(
    'says that nothing was attempted when the classes report nothing, in a %s panel',
    (panelRole) => {
      renderView({ panelRole, value: entryWith(EMPTY_DESTINATION_FAILED) });

      expect(screen.getByTestId('streamsDestinationFailuresNoData').textContent).toBe(
        'No delivery attempts in this time range.'
      );
      expect(isShown('streamsDestinationFailuresNone')).toBe(false);
    }
  );

  describe('when only failures of neither class exist, such as parse errors or 429 responses', () => {
    const otherOnly = entryWith({ ...noFailures, total: totalFailures, series: failedSeries });

    it.each(['failures', 'delivery'] as const)(
      'does not say that nothing failed, and shows the chart, in a %s panel',
      (panelRole) => {
        renderView({ panelRole, value: otherOnly });

        expect(screen.getByTestId('streamsDestinationFailuresNoClasses').textContent).toBe(
          'No authentication or authorization failures in this time range.'
        );
        expect(isShown('streamsDestinationFailuresNone')).toBe(false);
        expect(isShown('streamsDestinationDeliveryChart')).toBe(true);
      }
    );

    it('says so without a chart when there is no series', () => {
      renderView({ value: entryWith({ ...noFailures, total: totalFailures }) });

      expect(isShown('streamsDestinationFailuresNoClasses')).toBe(true);
      expect(isShown('streamsDestinationFailuresNone')).toBe(false);
      expect(isShown('streamsDestinationDeliveryChart')).toBe(false);
    });

    it('has no class stats and no causes tables', () => {
      renderView({ value: otherOnly });

      expect(isShown('streamsDestinationFailuresAuthentication')).toBe(false);
      expect(isShown('streamsDestinationFailuresAuthorizationCauses')).toBe(false);
    });
  });

  describe('when the query for the classes failed but the series loaded', () => {
    const withWarning = {
      ...entryWith({ ...EMPTY_DESTINATION_FAILED, series: failedSeries }),
      error: { code: 'error', reason: 'The stats query failed.' },
    };

    it.each(['failures', 'delivery'] as const)(
      'shows the chart next to the warning, in a %s panel',
      (panelRole) => {
        renderView({ panelRole, value: withWarning });

        expect(isShown('streamsDestinationFailuresPartialError')).toBe(true);
        expect(isShown('streamsDestinationDeliveryChart')).toBe(true);
        expect(isShown('streamsDestinationFailuresNone')).toBe(false);
        expect(isShown('streamsDestinationFailuresNoData')).toBe(false);
      }
    );

    it('shows only the warning when the series did not load either', () => {
      renderView({ value: fixtureEntry('partialFailure', 'es-dev') });

      expect(isShown('streamsDestinationFailuresPartialError')).toBe(true);
      expect(isShown('streamsDestinationDeliveryChart')).toBe(false);
    });
  });

  describe('the title', () => {
    it('names the failures in a failures panel', () => {
      renderView({ panelRole: 'failures', value: entryWith(EMPTY_DESTINATION_FAILED) });

      expect(screen.getByRole('heading', { name: 'Delivery failures' })).toBeInTheDocument();
    });

    it('is neutral in a delivery panel, which shows more than failures', () => {
      renderView({ panelRole: 'delivery', value: entryWith(EMPTY_DESTINATION_FAILED) });

      expect(screen.getByRole('heading', { name: 'Delivery' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Delivery failures' })).not.toBeInTheDocument();
    });
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
