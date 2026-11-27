/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EMPTY_DESTINATION_FAILED } from '../../../../../services/unit_stats_client/map_stats_response';
import type { DestinationFailedView } from '../../../../../services/unit_stats_client/types';
import { DestinationFailureIcon } from './destination_failure_icon';

// The sparklines are charts, which need the services of the page, and have tests of their own.
jest.mock('../../../../streams_layout/destinations/failure_sparkline', () => ({
  FailureSparkline: ({ dataTestSubj }: { dataTestSubj?: string }) => (
    <div data-test-subj={dataTestSubj} />
  ),
}));
// What the popover fetches has tests of its own. Here it is what the hook answers.
const mockUseDestinationPopoverFailures = jest.fn();
jest.mock('../../../../unit_stats/use_destination_popover_failures', () => ({
  useDestinationPopoverFailures: (...args: unknown[]) => mockUseDestinationPopoverFailures(...args),
}));

const ICON = 'streamsCanvasDestinationFailures';
const POPOVER = `${ICON}Popover`;
const SUMMARY = 'streamsDestinationFailurePopoverSummary';

const FAILED: DestinationFailedView = {
  ...EMPTY_DESTINATION_FAILED,
  authentication: { rate: 0.5, unit: '{item}', percentage: 11.9, breakdown: [] },
};

const series = {
  bucketMs: 60_000,
  unit: '{item}',
  window: { start: '2026-11-16T20:00:00.000Z', end: '2026-11-16T20:05:00.000Z' },
  points: [],
};

const isShown = (testId: string) => screen.queryByTestId(testId) !== null;

const renderIcon = () =>
  render(<DestinationFailureIcon destinationId="es-dev" failed={FAILED} dataTestSubj={ICON} />);

const openPopover = async () => {
  fireEvent.mouseEnter(screen.getByTestId(ICON));
  await screen.findByTestId(POPOVER);
};

describe('DestinationFailureIcon', () => {
  beforeEach(() => mockUseDestinationPopoverFailures.mockReset());

  it('asks for the destination, and only while the popover is open', async () => {
    renderIcon();
    expect(mockUseDestinationPopoverFailures).toHaveBeenLastCalledWith('es-dev', false);

    await openPopover();

    expect(mockUseDestinationPopoverFailures).toHaveBeenLastCalledWith('es-dev', true);
  });

  it('shows no sparkline before the series arrives, with the figures that the Map has', async () => {
    renderIcon();

    await openPopover();

    expect(isShown(`${SUMMARY}AuthenticationSparkline`)).toBe(false);
    expect(screen.getByTestId(`${SUMMARY}AuthenticationPercentage`).textContent).toContain('12%');
  });

  it('shows the sparklines, and the figures of the same response, once they arrive', async () => {
    mockUseDestinationPopoverFailures.mockReturnValue({
      ...EMPTY_DESTINATION_FAILED,
      authentication: { rate: 0.9, unit: '{item}', percentage: 20, breakdown: [] },
      series,
    });
    renderIcon();

    await openPopover();

    expect(isShown(`${SUMMARY}AuthenticationSparkline`)).toBe(true);
    expect(screen.getByTestId(`${SUMMARY}AuthenticationPercentage`).textContent).toContain('20%');
    expect(screen.getByTestId(`${SUMMARY}AuthenticationRate`).textContent).toContain('0.90/s');
  });

  it('keeps the figures of the Map when the failures have stopped since it loaded them', async () => {
    mockUseDestinationPopoverFailures.mockReturnValue({ ...EMPTY_DESTINATION_FAILED, series });
    renderIcon();

    await openPopover();

    expect(screen.getByTestId(`${SUMMARY}AuthenticationPercentage`).textContent).toContain('12%');
  });
});
