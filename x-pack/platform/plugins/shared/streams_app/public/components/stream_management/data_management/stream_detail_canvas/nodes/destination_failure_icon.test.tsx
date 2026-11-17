/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EMPTY_DESTINATION_FAILED } from '../../../../../services/unit_stats_client/map_stats_response';
import type { DestinationFailedView } from '../../../../../services/unit_stats_client/types';
import { DestinationFailureIcon } from './destination_failure_icon';

// The sparklines are charts, which need the services of the page, and have tests of their own.
jest.mock('../../../../unit_stats/failure_sparkline', () => ({ FailureSparkline: () => null }));

const ICON = 'streamsCanvasDestinationFailures';
const POPOVER = `${ICON}Popover`;
const SUMMARY = 'streamsDestinationFailurePopoverSummary';

const FAILED: DestinationFailedView = {
  ...EMPTY_DESTINATION_FAILED,
  authentication: { rate: 0.5, unit: '{item}', percentage: 11.9, breakdown: [] },
};

const isShown = (testId: string) => screen.queryByTestId(testId) !== null;

const renderIcon = (failed: DestinationFailedView = FAILED) =>
  render(<DestinationFailureIcon failed={failed} dataTestSubj={ICON} />);

describe('DestinationFailureIcon', () => {
  it('is closed until the pointer or the focus reaches it', () => {
    renderIcon();

    expect(isShown(ICON)).toBe(true);
    expect(isShown(POPOVER)).toBe(false);
  });

  it('can take the focus, so the keyboard reaches it', () => {
    renderIcon();

    expect(screen.getByTestId(ICON)).toHaveAttribute('tabindex', '0');
  });

  it('opens on hover, with the failures', async () => {
    renderIcon();

    fireEvent.mouseEnter(screen.getByTestId(ICON));

    const popover = await screen.findByTestId(POPOVER);
    expect(within(popover).getByText('Delivery failures')).toBeInTheDocument();
    expect(screen.getByTestId(`${SUMMARY}Subtitle`).textContent).toBe(
      'Of events in the last 15 minutes'
    );
    expect(screen.getByTestId(`${SUMMARY}AuthenticationPercentage`).textContent).toContain('12%');
    expect(screen.getByTestId(`${SUMMARY}AuthenticationRate`).textContent).toContain('0.50/s');
  });

  it('opens on focus, so the keyboard reaches it', async () => {
    renderIcon();

    fireEvent.focus(screen.getByTestId(ICON));

    expect(await screen.findByTestId(POPOVER)).toBeInTheDocument();
  });

  it('closes after the pointer leaves', async () => {
    renderIcon();
    fireEvent.mouseEnter(screen.getByTestId(ICON));
    await screen.findByTestId(POPOVER);

    fireEvent.mouseLeave(screen.getByTestId(ICON));

    await waitFor(() => expect(isShown(POPOVER)).toBe(false));
  });

  it('closes when the focus leaves', async () => {
    renderIcon();
    fireEvent.focus(screen.getByTestId(ICON));
    await screen.findByTestId(POPOVER);

    fireEvent.blur(screen.getByTestId(ICON));

    await waitFor(() => expect(isShown(POPOVER)).toBe(false));
  });

  it('stays open when the pointer moves from the icon onto the popover', async () => {
    renderIcon();
    fireEvent.mouseEnter(screen.getByTestId(ICON));
    const popover = await screen.findByTestId(POPOVER);

    fireEvent.mouseLeave(screen.getByTestId(ICON));
    fireEvent.mouseEnter(popover);
    // Longer than the delay before it closes.
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(isShown(POPOVER)).toBe(true);
  });

  it('closes when the pointer leaves the popover', async () => {
    renderIcon();
    fireEvent.mouseEnter(screen.getByTestId(ICON));
    const popover = await screen.findByTestId(POPOVER);
    fireEvent.mouseEnter(popover);

    fireEvent.mouseLeave(popover);

    await waitFor(() => expect(isShown(POPOVER)).toBe(false));
  });

  it('lets a click reach the node, which opens its flyout, and closes itself', async () => {
    const onNodeClick = jest.fn();
    render(
      <div role="presentation" onClick={onNodeClick}>
        <DestinationFailureIcon failed={FAILED} dataTestSubj={ICON} />
      </div>
    );
    fireEvent.mouseEnter(screen.getByTestId(ICON));
    await screen.findByTestId(POPOVER);

    fireEvent.click(screen.getByTestId(ICON));

    expect(onNodeClick).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(isShown(POPOVER)).toBe(false));
  });

  it('keeps the canvas from dragging or panning while the pointer is on the icon', () => {
    const { container } = renderIcon();

    expect(container.querySelector('.nodrag.nopan')).not.toBeNull();
  });

  it('does not set a timer that outlives it', () => {
    jest.useFakeTimers();
    try {
      const { unmount } = renderIcon();
      fireEvent.mouseEnter(screen.getByTestId(ICON));
      fireEvent.mouseLeave(screen.getByTestId(ICON));

      unmount();

      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });
});
