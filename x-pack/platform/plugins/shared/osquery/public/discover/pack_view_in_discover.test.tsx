/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';

import { PackViewInDiscoverAction } from './pack_view_in_discover';
import { usePackQueryLastResults } from '../packs/use_pack_query_last_results';

vi.mock('../packs/use_pack_query_last_results');

const mockViewResultsInDiscoverAction = vi.fn((_props: Record<string, unknown>) => null);
vi.mock('./view_results_in_discover', () => {
  const mocked = {
    ViewResultsInDiscoverAction: (props: Record<string, unknown>) =>
      mockViewResultsInDiscoverAction(props),
  };

  return { ...mocked, default: mocked };
});

const usePackQueryLastResultsMock = usePackQueryLastResults as MockedFunction<
  typeof usePackQueryLastResults
>;

const mockLastResultTime = (lastResultTime?: string[]) => {
  usePackQueryLastResultsMock.mockReturnValue({
    data: lastResultTime ? { lastResultTime } : null,
  } as ReturnType<typeof usePackQueryLastResults>);
};

/** Props the mocked `ViewResultsInDiscoverAction` was rendered with. */
const capturedProps = () => mockViewResultsInDiscoverAction.mock.calls[0][0];

describe('PackViewInDiscoverAction', () => {
  const timestamp = '2026-08-10T09:00:00.000Z';
  const item = { action_id: 'action-query-1' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLastResultTime(['2026-08-10T09:48:47.000Z']);
  });

  // A live query has no `interval`, and the pre-fix window subtracted it from the
  // last result — `moment(x).subtract(undefined, 'seconds')` is a no-op, so both
  // bounds collapsed onto the same instant and Discover showed nothing.
  // https://github.com/elastic/sdh-security-team/issues/1779
  it('spans a non-empty window for a live query row', () => {
    render(<PackViewInDiscoverAction item={item} timestamp={timestamp} />);

    const { startDate, endDate } = capturedProps();

    expect(startDate).toBe(timestamp);
    expect(endDate).toBe('now');
    expect(startDate).not.toEqual(endDate);
  });

  it('leaves the window open when no results have been indexed yet', () => {
    mockLastResultTime(undefined);

    render(<PackViewInDiscoverAction item={item} timestamp={timestamp} />);

    expect(capturedProps()).toEqual(
      expect.objectContaining({ startDate: timestamp, endDate: 'now', mode: 'relative' })
    );
  });

  it('keeps the hour either side of a scheduled execution', () => {
    render(
      <PackViewInDiscoverAction
        item={item}
        timestamp={timestamp}
        scheduleId="schedule-id"
        executionCount={7}
      />
    );

    expect(capturedProps()).toEqual(
      expect.objectContaining({
        startDate: '2026-08-10T08:00:00.000Z',
        endDate: '2026-08-10T10:00:00.000Z',
        scheduleId: 'schedule-id',
        executionCount: 7,
      })
    );
  });
});
