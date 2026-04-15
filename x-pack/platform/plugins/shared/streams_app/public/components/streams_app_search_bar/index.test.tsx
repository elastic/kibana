/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { of } from 'rxjs';
import type { UncontrolledStreamsAppSearchBarProps } from './uncontrolled_streams_app_bar';
import { StreamsAppSearchBar } from '.';
import { useTimeRange } from '../../hooks/use_time_range';
import { useTimeRangeUpdate } from '../../hooks/use_time_range_update';
import { useTimefilter } from '../../hooks/use_timefilter';

jest.mock('./uncontrolled_streams_app_bar', () => ({
  UncontrolledStreamsAppSearchBar: (props: UncontrolledStreamsAppSearchBarProps) => {
    // Store onQuerySubmit on the DOM so tests can invoke it
    return <div data-testid="mockSearchBar" ref={() => (capturedProps = props)} />;
  },
}));

jest.mock('../../hooks/use_time_range');
jest.mock('../../hooks/use_time_range_update');
jest.mock('../../hooks/use_timefilter');

const mockUseTimeRange = useTimeRange as jest.MockedFunction<typeof useTimeRange>;
const mockUseTimeRangeUpdate = useTimeRangeUpdate as jest.MockedFunction<typeof useTimeRangeUpdate>;
const mockUseTimefilter = useTimefilter as jest.MockedFunction<typeof useTimefilter>;

let capturedProps: UncontrolledStreamsAppSearchBarProps;

const mockUpdateTimeRange = jest.fn();
const mockRefresh = jest.fn();

const dateRange = { from: 'now-15m', to: 'now' };
const query = { query: '', language: 'kuery' };

const mockTimeState = {
  start: 1704067200000,
  end: 1704068100000,
  timeRange: { from: 'now-15m', to: 'now' },
  asAbsoluteTimeRange: {
    from: '2024-01-01T00:00:00.000Z',
    to: '2024-01-01T00:15:00.000Z',
    mode: 'absolute' as const,
  },
};

beforeEach(() => {
  jest.clearAllMocks();

  mockUseTimeRange.mockReturnValue({
    rangeFrom: 'now-15m',
    rangeTo: 'now',
    start: '2024-01-01T00:00:00.000Z',
    end: '2024-01-01T00:15:00.000Z',
    startMs: 1704067200000,
    endMs: 1704068100000,
  });

  mockUseTimeRangeUpdate.mockReturnValue({
    updateTimeRange: mockUpdateTimeRange,
  });

  mockUseTimefilter.mockReturnValue({
    refresh: mockRefresh,
    setTime: jest.fn(),
    timeState: mockTimeState,
    timeState$: of({ kind: 'initial' as const, timeState: mockTimeState }),
  });
});

describe('StreamsAppSearchBar', () => {
  describe('when the refresh button is clicked (isUpdate: false)', () => {
    it('should call refresh()', () => {
      render(<StreamsAppSearchBar />);

      capturedProps.onQuerySubmit!({ dateRange, query }, false);

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('should call updateTimeRange()', () => {
      render(<StreamsAppSearchBar />);

      capturedProps.onQuerySubmit!({ dateRange, query }, false);

      expect(mockUpdateTimeRange).toHaveBeenCalledWith(dateRange);
    });
  });

  describe('when the query or time range changes (isUpdate: true)', () => {
    it('should not call refresh()', () => {
      render(<StreamsAppSearchBar />);

      capturedProps.onQuerySubmit!({ dateRange, query }, true);

      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('should call updateTimeRange()', () => {
      render(<StreamsAppSearchBar />);

      capturedProps.onQuerySubmit!({ dateRange, query }, true);

      expect(mockUpdateTimeRange).toHaveBeenCalledWith(dateRange);
    });
  });

  describe('parent onQuerySubmit forwarding', () => {
    it('should forward onQuerySubmit to the parent callback', () => {
      const parentOnQuerySubmit = jest.fn();
      render(<StreamsAppSearchBar onQuerySubmit={parentOnQuerySubmit} />);

      capturedProps.onQuerySubmit!({ dateRange, query }, false);

      expect(parentOnQuerySubmit).toHaveBeenCalledWith({ dateRange, query }, false);
    });

    it('should forward isUpdate: true to the parent callback', () => {
      const parentOnQuerySubmit = jest.fn();
      render(<StreamsAppSearchBar onQuerySubmit={parentOnQuerySubmit} />);

      capturedProps.onQuerySubmit!({ dateRange, query }, true);

      expect(parentOnQuerySubmit).toHaveBeenCalledWith({ dateRange, query }, true);
    });
  });

  it('should pass rangeFrom and rangeTo from useTimeRange to the search bar', () => {
    render(<StreamsAppSearchBar />);

    expect(capturedProps.dateRangeFrom).toBe('now-15m');
    expect(capturedProps.dateRangeTo).toBe('now');
  });
});
