/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { EuiThemeProvider } from '@elastic/eui';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { LifecycleTimeline } from './lifecycle_timeline';
import type { LifecycleTimelinePeriod } from './types';

const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;

const examplePeriods: LifecycleTimelinePeriod[] = [
  {
    id: 'recent',
    label: 'Recent',
    color: '#8144CC',
    maxAge: { label: '12h', valueInMs: 12 * HOUR_IN_MS },
    size: '12 GB',
    tooltipContent: 'Details for recent data',
  },
  {
    id: 'older',
    label: 'Older',
    color: '#B386F9',
    maxAge: { label: '3d', valueInMs: 3 * DAY_IN_MS },
    size: '40 GB',
    tooltipContent: 'Details for older data',
  },
  {
    id: 'oldest',
    label: 'Oldest',
    color: '#E2D3FE',
    tooltipContent: 'Details for oldest data',
  },
];

const renderTimeline = (props: Partial<React.ComponentProps<typeof LifecycleTimeline>> = {}) =>
  render(
    <LifecycleTimeline periods={examplePeriods} aria-label="Periods by age of data" {...props} />,
    { wrapper: EuiThemeProvider }
  );

describe('LifecycleTimeline', () => {
  it('renders a labelled list with one item per period, in order', () => {
    renderTimeline();

    const list = screen.getByRole('list', { name: 'Periods by age of data' });
    const items = within(list).getAllByRole('listitem');

    expect(items).toHaveLength(3);
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Recent'),
      expect.stringContaining('Older'),
      expect.stringContaining('Oldest'),
    ]);
  });

  it('shows the size below the name only when it is passed', () => {
    renderTimeline();

    expect(screen.getByTestId('lifecycleTimeline-period-recent-size')).toHaveTextContent('12 GB');
    expect(screen.queryByTestId('lifecycleTimeline-period-oldest-size')).toBeNull();
  });

  it('describes the age range of each period for screen readers', () => {
    renderTimeline();

    expect(screen.getByTestId('lifecycleTimeline-period-recent')).toHaveTextContent(
      'From 0 to 12h'
    );
    expect(screen.getByTestId('lifecycleTimeline-period-oldest')).toHaveTextContent('From 3d to ∞');
  });

  it('shows a tick for the start of each period and ∞ at the end', () => {
    renderTimeline();

    expect(screen.getByTestId('lifecycleTimeline-tick-recent')).toHaveTextContent('0');
    expect(screen.getByTestId('lifecycleTimeline-tick-older')).toHaveTextContent('12h');
    expect(screen.getByTestId('lifecycleTimeline-tick-oldest')).toHaveTextContent('3d');
    expect(screen.getByTestId('lifecycleTimeline-retention')).toHaveTextContent('∞');
  });

  it('shows the retention at the end when it is passed', () => {
    renderTimeline({ retention: '30d' });

    expect(screen.getByTestId('lifecycleTimeline-retention')).toHaveTextContent('30d');
  });

  it('leaves out periods with an empty age range', () => {
    renderTimeline({
      periods: [
        { ...examplePeriods[0], maxAge: { label: '0', valueInMs: 0 } },
        ...examplePeriods.slice(1),
      ],
    });

    expect(screen.queryByTestId('lifecycleTimeline-period-recent')).toBeNull();
    expect(screen.getByTestId('lifecycleTimeline-tick-older')).toHaveTextContent('0');
  });

  it('renders nothing when there are no periods to show', () => {
    const { container } = renderTimeline({ periods: [] });

    expect(container).toBeEmptyDOMElement();
  });

  it('makes bars with a tooltip focusable and shows the name and details on focus', async () => {
    renderTimeline();

    const bar = screen.getByTestId('lifecycleTimeline-period-recent');
    expect(bar).toHaveAttribute('tabindex', '0');

    act(() => bar.focus());

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('Recent');
    expect(tooltip).toHaveTextContent('Details for recent data');
  });

  it('outlines the bars the consumer highlights', () => {
    renderTimeline({ periods: [{ ...examplePeriods[0], isHighlighted: true }, examplePeriods[2]] });

    expect(
      getComputedStyle(screen.getByTestId('lifecycleTimeline-period-recent')).boxShadow
    ).toMatch(/^inset 0 0 0 2px/);
    expect(screen.getByTestId('lifecycleTimeline-period-oldest')).toHaveStyle({
      boxShadow: 'none',
    });
  });

  it('does not make bars without a tooltip or click handling focusable', () => {
    renderTimeline({ periods: [{ ...examplePeriods[2], tooltipContent: undefined }] });

    const bar = screen.getByTestId('lifecycleTimeline-period-oldest');
    expect(bar).not.toHaveAttribute('tabindex');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('calls onClick and opens the popover content when a bar is clicked', async () => {
    const onClick = jest.fn();
    renderTimeline({
      periods: [
        {
          ...examplePeriods[0],
          tooltipContent: undefined,
          popoverContent: <p>Hot phase details</p>,
          onClick,
        },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: /Recent/ }));

    expect(onClick).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText('Hot phase details')).toBeInTheDocument());
  });

  it('shows the tooltip on hover and hides it while the popover opened by a click is open', async () => {
    renderTimeline({
      periods: [{ ...examplePeriods[0], popoverContent: <p>Hot phase details</p> }],
    });

    const bar = screen.getByRole('button', { name: /Recent/ });
    fireEvent.mouseOver(bar);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Details for recent data');

    fireEvent.click(bar);

    await waitFor(() => expect(screen.getByText('Hot phase details')).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());

    fireEvent.mouseOut(bar);
    fireEvent.mouseOver(bar);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('closes the popover when its content is removed and keeps it closed when it comes back', async () => {
    const withPopover = [{ ...examplePeriods[0], popoverContent: <p>Hot phase details</p> }];
    const { rerender } = renderTimeline({ periods: withPopover });

    fireEvent.click(screen.getByRole('button', { name: /Recent/ }));
    await waitFor(() => expect(screen.getByText('Hot phase details')).toBeInTheDocument());

    rerender(
      <LifecycleTimeline periods={[examplePeriods[0]]} aria-label="Periods by age of data" />
    );
    expect(screen.queryByText('Hot phase details')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();

    rerender(<LifecycleTimeline periods={withPopover} aria-label="Periods by age of data" />);
    expect(screen.getByRole('button', { name: /Recent/ })).toBeInTheDocument();
    expect(screen.queryByText('Hot phase details')).toBeNull();
  });

  it('calls onClick on a bar with a tooltip and no popover', async () => {
    const onClick = jest.fn();
    renderTimeline({ periods: [{ ...examplePeriods[0], onClick }] });

    const bar = screen.getByRole('button', { name: /Recent/ });
    expect(bar).not.toHaveAttribute('aria-expanded');

    fireEvent.mouseOver(bar);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Details for recent data');

    fireEvent.click(bar);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('keeps the bar mounted and focused when the popover content is removed', () => {
    const onClick = jest.fn();
    const withPopover = [{ ...examplePeriods[2], popoverContent: <p>Oldest details</p>, onClick }];
    const { rerender } = renderTimeline({ periods: withPopover });

    const bar = screen.getByRole('button', { name: /Oldest/ });
    act(() => bar.focus());

    rerender(
      <LifecycleTimeline
        periods={[{ ...examplePeriods[2], onClick }]}
        aria-label="Periods by age of data"
      />
    );

    expect(screen.getByRole('button', { name: /Oldest/ })).toBe(bar);
    expect(bar).toHaveFocus();
    expect(bar).not.toHaveAttribute('aria-haspopup');
  });

  it('lets the popover content close the popover', async () => {
    renderTimeline({
      periods: [
        {
          ...examplePeriods[0],
          popoverContent: ({ closePopover }) => <button onClick={closePopover}>Edit</button>,
        },
      ],
    });

    const bar = screen.getByRole('button', { name: /Recent/ });
    fireEvent.click(bar);
    await waitFor(() => expect(bar).toHaveAttribute('aria-expanded', 'true'));

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await waitFor(() => expect(bar).toHaveAttribute('aria-expanded', 'false'));
  });

  it('labels the popover with the element passed in its panel settings', async () => {
    renderTimeline({
      periods: [
        {
          ...examplePeriods[0],
          popoverContent: <h2 id="recentTitle">Recent details</h2>,
          popoverProps: { panelPaddingSize: 'none', 'aria-labelledby': 'recentTitle' },
        },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: /Recent/ }));

    expect(await screen.findByRole('dialog', { name: 'Recent details' })).not.toHaveAttribute(
      'aria-label'
    );
  });

  it('renders bars with colors it cannot read, like CSS variables', () => {
    renderTimeline({ periods: [{ ...examplePeriods[0], color: 'var(--period-color)' }] });

    expect(screen.getByTestId('lifecycleTimeline-period-recent')).toBeInTheDocument();
  });
});
