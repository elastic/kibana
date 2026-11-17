/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EMPTY_DESTINATION_FAILED } from '../../../services/unit_stats_client/map_stats_response';
import type {
  DeliverySeriesView,
  DestinationFailedView,
  FailureClassView,
} from '../../../services/unit_stats_client/types';
import { DestinationFailurePopoverSummary } from './destination_failure_popover_summary';

// The sparkline is a chart, which needs the services of the page, and has tests of its own.
jest.mock('./failure_sparkline', () => ({
  FailureSparkline: ({
    dataTestSubj,
    failureClass,
  }: {
    dataTestSubj?: string;
    failureClass: string;
  }) => <div data-test-subj={dataTestSubj} data-failure-class={failureClass} />,
}));

const SUMMARY = 'streamsDestinationFailurePopoverSummary';

const series: DeliverySeriesView = {
  bucketMs: 60_000,
  unit: '{item}',
  window: { start: '2026-11-16T20:00:00.000Z', end: '2026-11-16T20:05:00.000Z' },
  points: [],
};

const failureClass = (
  rate: number | null,
  percentage: number | null,
  { unit = '{item}' }: { unit?: string } = {}
): FailureClassView => ({ rate, unit, percentage, breakdown: [] });

const renderSummary = (failed: Partial<DestinationFailedView>) =>
  render(
    <DestinationFailurePopoverSummary
      failed={{ ...EMPTY_DESTINATION_FAILED, ...failed }}
      minutes={15}
    />
  );

const text = (testId: string) => screen.getByTestId(testId).textContent;
const isShown = (testId: string) => screen.queryByTestId(testId) !== null;

describe('DestinationFailurePopoverSummary', () => {
  it('renders nothing when neither class has failures', () => {
    renderSummary({ authentication: failureClass(0, 0), authorization: failureClass(null, null) });

    expect(isShown(SUMMARY)).toBe(false);
  });

  it('has a title, and what the figures are a share of, once, for the last minutes', () => {
    renderSummary({ authentication: failureClass(0.5, 11.9) });

    expect(screen.getByText('Delivery failures')).toBeInTheDocument();
    expect(text(`${SUMMARY}Subtitle`)).toBe('Of events in the last 15 minutes');
  });

  it('shows each class that has failures with its percentage and its rate', () => {
    renderSummary({
      authentication: failureClass(0.5, 11.9),
      authorization: failureClass(1.9, 45.2),
    });

    expect(text(`${SUMMARY}AuthenticationPercentage`)).toContain('12%');
    expect(text(`${SUMMARY}AuthenticationRate`)).toContain('0.50/s');
    expect(text(`${SUMMARY}AuthorizationPercentage`)).toContain('45%');
    expect(text(`${SUMMARY}AuthorizationRate`)).toContain('1.9/s');
  });

  it('leaves out a class that has no failures', () => {
    renderSummary({ authorization: failureClass(1.9, 45.2) });

    expect(isShown(`${SUMMARY}Authorization`)).toBe(true);
    expect(isShown(`${SUMMARY}Authentication`)).toBe(false);
  });

  it('names upload attempts for a destination that counts them', () => {
    renderSummary({ authentication: failureClass(0.44, 100, { unit: '{request}' }) });

    expect(text(`${SUMMARY}Subtitle`)).toBe('Of upload attempts in the last 15 minutes');
  });

  it('shows a sparkline of its own class for each class with failures when there is a series', () => {
    renderSummary({
      authentication: failureClass(0.5, 11.9),
      authorization: failureClass(1.9, 45.2),
      series,
    });

    expect(screen.getByTestId(`${SUMMARY}AuthenticationSparkline`)).toHaveAttribute(
      'data-failure-class',
      'authentication'
    );
    expect(screen.getByTestId(`${SUMMARY}AuthorizationSparkline`)).toHaveAttribute(
      'data-failure-class',
      'authorization'
    );
  });

  it('shows no sparkline without a series', () => {
    renderSummary({ authentication: failureClass(0.5, 11.9) });
    expect(isShown(`${SUMMARY}AuthenticationSparkline`)).toBe(false);
  });

  it('draws no sparkline for a class with no failures, whatever the series', () => {
    renderSummary({ authentication: failureClass(0.5, 11.9), series });

    expect(isShown(`${SUMMARY}AuthenticationSparkline`)).toBe(true);
    expect(isShown(`${SUMMARY}AuthorizationSparkline`)).toBe(false);
  });
});
