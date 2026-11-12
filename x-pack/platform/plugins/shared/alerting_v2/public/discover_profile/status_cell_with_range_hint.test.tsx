/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  EpisodeStatusCellWithRangeHint,
  isStatusPossiblyOutdated,
} from './status_cell_with_range_hint';

const mockNow = Date.parse('2026-11-12T12:00:00.000Z');
const mockPastRangeEnd = '2026-11-10T12:00:00.000Z';

const makeProps = (status: string, rangeEnd: string | undefined) => ({
  row: { id: '0', raw: {}, flattened: { 'episode.id': 'ep-1', 'episode.status': status } },
  columnId: 'episode.status',
  dataView: {} as never,
  fieldFormats: {} as never,
  closePopover: jest.fn(),
  setCellProps: jest.fn(),
  rowIndex: 0,
  colIndex: 0,
  isDetails: false,
  isExpanded: false,
  isExpandable: false,
  rowHeight: 1,
  rangeEnd,
  dateFormat: undefined,
});

describe('isStatusPossiblyOutdated', () => {
  it.each(['pending', 'active', 'recovering'])(
    'flags a %s episode when the range ends in the past',
    (status) => {
      expect(isStatusPossiblyOutdated({ status, rangeEnd: mockPastRangeEnd, now: mockNow })).toBe(
        true
      );
    }
  );

  it('does not flag an inactive episode, which can no longer change', () => {
    expect(
      isStatusPossiblyOutdated({ status: 'inactive', rangeEnd: mockPastRangeEnd, now: mockNow })
    ).toBe(false);
  });

  it('does not flag a range that ends now or later', () => {
    const justBeforeNow = new Date(mockNow - 5_000).toISOString();
    const later = new Date(mockNow + 60 * 60_000).toISOString();

    expect(
      isStatusPossiblyOutdated({ status: 'active', rangeEnd: justBeforeNow, now: mockNow })
    ).toBe(false);
    expect(isStatusPossiblyOutdated({ status: 'active', rangeEnd: later, now: mockNow })).toBe(
      false
    );
  });

  it('does not flag rows without a status or a range', () => {
    expect(
      isStatusPossiblyOutdated({ status: undefined, rangeEnd: mockPastRangeEnd, now: mockNow })
    ).toBe(false);
    expect(isStatusPossiblyOutdated({ status: 'active', rangeEnd: undefined, now: mockNow })).toBe(
      false
    );
  });
});

describe('EpisodeStatusCellWithRangeHint', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(mockNow);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('marks an active episode when the range ends in the past', () => {
    render(
      <I18nProvider>
        <EpisodeStatusCellWithRangeHint {...makeProps('active', mockPastRangeEnd)} />
      </I18nProvider>
    );

    // Next to the status label, inside the badge.
    expect(screen.getByTestId('alertEpisodeStatusDot').parentElement).toContainElement(
      screen.getByTestId('alertingV2DiscoverStatusOutdatedHint')
    );
  });

  it('does not mark an inactive episode', () => {
    render(
      <I18nProvider>
        <EpisodeStatusCellWithRangeHint {...makeProps('inactive', mockPastRangeEnd)} />
      </I18nProvider>
    );

    expect(screen.queryByTestId('alertingV2DiscoverStatusOutdatedHint')).not.toBeInTheDocument();
  });
});
