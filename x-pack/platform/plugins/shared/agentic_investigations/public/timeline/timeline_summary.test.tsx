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
import type { ImpactMapEvent } from '../../common';
import { TimelineSummary } from './timeline_summary';

const event = (
  id: string,
  kind: ImpactMapEvent['kind'],
  at: string,
  title = id,
  summary?: string
): ImpactMapEvent => ({
  id,
  kind,
  title,
  at,
  ...(summary && { summary }),
});

const hidden = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    event(`hidden-${count}-${i}`, 'investigation', '2026-10-30T13:30:00Z')
  );

const data = {
  events: [
    event(
      'up',
      'change',
      '2026-10-30T12:18:00Z',
      'Collector replica set came up at 12:18Z and was gone by 18:09Z, so it ran about six hours',
      'Collector replica set ran for six hours'
    ),
    event('cause', 'root_cause', '2026-10-30T13:00:00Z', 'Records over 16 MB were dropped'),
    event('impact', 'customer_impact', '2026-10-30T13:00:00Z', 'About 5.9 million points lost'),
    event('alert', 'alert', '2026-10-30T17:05:00Z', 'Export coverage alert fired'),
    event('clean', 'recovery', '2026-10-30T19:00:00Z', 'Exports clean from 19:00Z'),
  ],
  hiddenBetween: [hidden(3), [], hidden(12), []],
  windows: [
    {
      label: 'Data dropped 13:00 to 19:00Z',
      start: '2026-10-30T13:00:00Z',
      end: '2026-10-30T19:00:00Z',
    },
  ],
};

const renderSummary = (onOpenEvent = jest.fn(), onOpenHidden = jest.fn()) => {
  render(
    <EuiProvider>
      <I18nProvider>
        <TimelineSummary data={data} onOpenEvent={onOpenEvent} onOpenHidden={onOpenHidden} />
      </I18nProvider>
    </EuiProvider>
  );
  return { onOpenEvent, onOpenHidden };
};

describe('TimelineSummary hover', () => {
  const impactMap = {
    entities: [{ id: 'svc', type_id: 'service', label: 'collector' }],
    relationships: [],
    entity_types: [{ id: 'service', label: 'Service', kind: 'service' as const }],
    relationship_types: [],
    events: [],
    created_at: '2026-10-30T00:00:00Z',
  };

  it('shows the key information on hover when it has the impact map', async () => {
    const withEntity = {
      ...data,
      events: [
        {
          ...data.events[0],
          entity_id: 'svc',
          description: 'Ran for six hours.',
        },
        ...data.events.slice(1),
      ],
    };
    render(
      <EuiProvider>
        <I18nProvider>
          <TimelineSummary
            data={withEntity}
            impactMap={{ ...impactMap, events: withEntity.events }}
            onOpenEvent={jest.fn()}
            onOpenHidden={jest.fn()}
          />
        </I18nProvider>
      </EuiProvider>
    );
    expect(screen.queryByTestId('agenticInvestigationsTimelineExpandedHover')).toBeNull();
    fireEvent.mouseEnter(screen.getByTestId('agenticInvestigationsTimelineSummaryEvent-0'));
    const card = screen.getByTestId('agenticInvestigationsTimelineExpandedHover');
    expect(card).toHaveTextContent(withEntity.events[0].title);
    // What kind of event it is, and when.
    expect(card).toHaveTextContent('Change');
    expect(card).toHaveTextContent('12:18Z');
    expect(card).toHaveTextContent('Affects');
    expect(card).toHaveTextContent('collector');
    expect(card).toHaveTextContent('Ran for six hours.');
    fireEvent.mouseLeave(screen.getByTestId('agenticInvestigationsTimelineSummaryEvent-0'));
    // The card fades out, so it is gone a moment later.
    await waitFor(() =>
      expect(screen.queryByTestId('agenticInvestigationsTimelineExpandedHover')).toBeNull()
    );
  });
});

describe('TimelineSummary', () => {
  it('shows the steps as a sequence: each with its time and one sentence, evenly spaced', () => {
    renderSummary();
    // Five steps, evenly spaced across the width, so each has room for its own label.
    expect(screen.getAllByTestId('agenticInvestigationsTimelineSummaryLabel')).toHaveLength(5);
    expect(screen.getByText('Collector replica set ran for six hours')).toBeInTheDocument();
    expect(screen.getByText('Records over 16 MB were dropped')).toBeInTheDocument();
    expect(screen.getByText('About 5.9 million points lost')).toBeInTheDocument();
    expect(screen.getByText('Export coverage alert fired')).toBeInTheDocument();
    expect(screen.getByText('Exports clean from 19:00Z')).toBeInTheDocument();
    expect(screen.getByText('12:18Z')).toBeInTheDocument();
    // The steps happened at 13:00 twice, yet are not drawn at the same place.
    const lefts = [0, 1, 2, 3, 4].map(
      (i) =>
        (
          screen.getByTestId(`agenticInvestigationsTimelineSummaryEvent-${i}`)
            .parentElement as HTMLElement
        ).className
    );
    expect(new Set(lefts).size).toBeGreaterThan(1);
  });

  it('cuts a long title at a word when there is no quick reference', () => {
    render(
      <EuiProvider>
        <I18nProvider>
          <TimelineSummary
            data={{
              ...data,
              events: [
                event('a', 'change', '2026-10-30T12:18:00Z', 'x '.repeat(80)),
                data.events[1],
              ],
              hiddenBetween: [[]],
              windows: [],
            }}
            onOpenEvent={jest.fn()}
            onOpenHidden={jest.fn()}
          />
        </I18nProvider>
      </EuiProvider>
    );
    expect(screen.getByText(/…$/)).toBeInTheDocument();
  });

  it('keeps the full title for hover and prints no time between events', () => {
    renderSummary();
    expect(screen.getByTestId('agenticInvestigationsTimelineSummaryEvent-0')).toHaveAttribute(
      'title',
      expect.stringContaining('Collector replica set came up at 12:18Z')
    );
    expect(screen.queryByText('+42m')).not.toBeInTheDocument();
  });

  it('shows a +count on the line where events are hidden, and opens them when it is clicked', () => {
    const { onOpenHidden } = renderSummary();
    const counts = screen.getAllByTestId('agenticInvestigationsTimelineSummaryHidden');
    expect(counts.map((el) => el.textContent)).toEqual(['+3', '+12']);
    fireEvent.click(counts[0]);
    expect(onOpenHidden).toHaveBeenCalledWith(['hidden-3-0', 'hidden-3-1', 'hidden-3-2']);
  });

  it('shades the impact and says on hover that it is customer impact, with no legend taking room', async () => {
    renderSummary();
    expect(screen.queryByTestId('agenticInvestigationsTimelineSummaryLegend')).toBeNull();
    expect(screen.queryByText('Customer impact')).not.toBeInTheDocument();
    fireEvent.mouseOver(screen.getByTestId('agenticInvestigationsTimelineSummaryWindow'));
    expect(await screen.findByText('Customer impact')).toBeInTheDocument();
    expect(await screen.findByText('Data dropped 13:00 to 19:00Z')).toBeInTheDocument();
  });

  it('shades nothing without a window', () => {
    render(
      <EuiProvider>
        <I18nProvider>
          <TimelineSummary
            data={{ ...data, windows: [] }}
            onOpenEvent={jest.fn()}
            onOpenHidden={jest.fn()}
          />
        </I18nProvider>
      </EuiProvider>
    );
    expect(screen.queryByTestId('agenticInvestigationsTimelineSummaryWindow')).toBeNull();
  });

  it('opens the event when its step is clicked', () => {
    const { onOpenEvent } = renderSummary();
    fireEvent.click(screen.getByTestId('agenticInvestigationsTimelineSummaryEvent-1'));
    expect(onOpenEvent).toHaveBeenCalledWith('cause');
  });
});
