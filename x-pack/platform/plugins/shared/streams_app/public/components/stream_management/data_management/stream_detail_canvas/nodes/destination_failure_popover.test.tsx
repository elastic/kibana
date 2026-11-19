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
import { DestinationFailurePopover } from './destination_failure_popover';

// The sparklines are charts, which need the services of the page, and have tests of their own.
jest.mock('../../../../streams_layout/destinations/failure_sparkline', () => ({
  FailureSparkline: () => null,
}));

const ICON = 'streamsCanvasDestinationFailures';
const POPOVER = `${ICON}Popover`;
const SUMMARY = 'streamsDestinationFailurePopoverSummary';

const FAILED: DestinationFailedView = {
  ...EMPTY_DESTINATION_FAILED,
  authentication: { rate: 0.5, unit: '{item}', percentage: 11.9, breakdown: [] },
};

const isShown = (testId: string) => screen.queryByTestId(testId) !== null;

const renderPopover = (onOpenChange?: (isOpen: boolean) => void) =>
  render(
    <DestinationFailurePopover failed={FAILED} onOpenChange={onOpenChange} dataTestSubj={ICON} />
  );

describe('DestinationFailurePopover', () => {
  it('is closed until the pointer or the focus reaches it', () => {
    renderPopover();

    expect(isShown(ICON)).toBe(true);
    expect(isShown(POPOVER)).toBe(false);
  });

  it('can take the focus, so the keyboard reaches it', () => {
    renderPopover();

    expect(screen.getByTestId(ICON)).toHaveAttribute('tabindex', '0');
  });

  it('opens on hover, with the failures it is given', async () => {
    renderPopover();

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
    renderPopover();

    fireEvent.focus(screen.getByTestId(ICON));

    expect(await screen.findByTestId(POPOVER)).toBeInTheDocument();
  });

  it('closes after the pointer leaves', async () => {
    renderPopover();
    fireEvent.mouseEnter(screen.getByTestId(ICON));
    await screen.findByTestId(POPOVER);

    fireEvent.mouseLeave(screen.getByTestId(ICON));

    await waitFor(() => expect(isShown(POPOVER)).toBe(false));
  });

  it('stays open when the pointer moves from the badge onto the popover', async () => {
    renderPopover();
    fireEvent.mouseEnter(screen.getByTestId(ICON));
    const popover = await screen.findByTestId(POPOVER);

    fireEvent.mouseLeave(screen.getByTestId(ICON), { relatedTarget: popover });

    expect(isShown(POPOVER)).toBe(true);
  });

  it('stays open while the pointer is inside the popover, and closes when it leaves it', async () => {
    renderPopover();
    fireEvent.mouseEnter(screen.getByTestId(ICON));
    const popover = await screen.findByTestId(POPOVER);
    fireEvent.mouseLeave(screen.getByTestId(ICON), { relatedTarget: popover });
    fireEvent.mouseEnter(popover);

    expect(isShown(POPOVER)).toBe(true);

    fireEvent.mouseLeave(popover, { relatedTarget: document.body });

    await waitFor(() => expect(isShown(POPOVER)).toBe(false));
  });

  it('stays open when the pointer moves from the popover back onto the badge', async () => {
    renderPopover();
    fireEvent.mouseEnter(screen.getByTestId(ICON));
    const popover = await screen.findByTestId(POPOVER);

    fireEvent.mouseLeave(popover, { relatedTarget: screen.getByTestId(ICON) });

    expect(isShown(POPOVER)).toBe(true);
  });

  it('closes when the pointer leaves the badge for anywhere but the popover', async () => {
    renderPopover();
    fireEvent.mouseEnter(screen.getByTestId(ICON));
    await screen.findByTestId(POPOVER);

    fireEvent.mouseLeave(screen.getByTestId(ICON), { relatedTarget: document.body });

    await waitFor(() => expect(isShown(POPOVER)).toBe(false));
  });

  it('closes when the focus leaves', async () => {
    renderPopover();
    fireEvent.focus(screen.getByTestId(ICON));
    await screen.findByTestId(POPOVER);

    fireEvent.blur(screen.getByTestId(ICON));

    await waitFor(() => expect(isShown(POPOVER)).toBe(false));
  });

  it('lets a click reach the node, which opens its flyout, and closes itself', async () => {
    const onNodeClick = jest.fn();
    render(
      <div role="presentation" onClick={onNodeClick}>
        <DestinationFailurePopover failed={FAILED} dataTestSubj={ICON} />
      </div>
    );
    fireEvent.mouseEnter(screen.getByTestId(ICON));
    await screen.findByTestId(POPOVER);

    fireEvent.click(screen.getByTestId(ICON));

    expect(onNodeClick).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(isShown(POPOVER)).toBe(false));
  });

  it('keeps the canvas from dragging or panning while the pointer is on the icon', () => {
    const { container } = renderPopover();

    expect(container.querySelector('.nodrag.nopan')).not.toBeNull();
  });

  it('tells its parent when it opens and when it closes', async () => {
    const onOpenChange = jest.fn();
    renderPopover(onOpenChange);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    fireEvent.mouseEnter(screen.getByTestId(ICON));
    await screen.findByTestId(POPOVER);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    fireEvent.mouseLeave(screen.getByTestId(ICON));
    await waitFor(() => expect(onOpenChange).toHaveBeenLastCalledWith(false));
  });
});
