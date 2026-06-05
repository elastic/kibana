/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';

import { DocCountCell } from './doc_count';
import { RequestResultType } from './get_doc_count';

jest.mock('react-use/lib/useObservable', () => jest.fn());

const mockedUseObservable = jest.requireMock('react-use/lib/useObservable');

describe('DocCountCell', () => {
  const docCountApi = {
    getByName: jest.fn(),
    getObservable: jest.fn(),
    abort: jest.fn(),
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Ensure we don't leave work in the React scheduler between tests.
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('shows a spinner while loading and requests the count for the index', () => {
    mockedUseObservable.mockReturnValue(undefined);

    render(<DocCountCell indexName="index-a" docCountApi={docCountApi} />);

    // Triggers request
    expect(docCountApi.getByName).toHaveBeenCalledWith('index-a');

    // Loading spinner rendered
    expect(screen.getByTestId('docCountLoadingSpinner')).toBeInTheDocument();
  });

  it.each(['closed', 'close'])(
    'shows an unavailable placeholder and skips the count request when the index status is %s',
    (indexStatus) => {
      mockedUseObservable.mockReturnValue(undefined);

      render(
        <DocCountCell indexName="index-a" indexStatus={indexStatus} docCountApi={docCountApi} />
      );

      expect(docCountApi.getByName).not.toHaveBeenCalled();
      expect(screen.getByTestId('docCountClosedIndex')).toHaveTextContent('-');
      expect(
        screen.getByLabelText('Document count is unavailable for closed indices.')
      ).toBeInTheDocument();
    }
  );

  it.each(['closed', 'close'])(
    'shows the spinner and delays the count request when the index status changes from %s to open',
    (indexStatus) => {
      mockedUseObservable.mockReturnValue(undefined);

      const { rerender } = render(
        <DocCountCell indexName="index-a" indexStatus={indexStatus} docCountApi={docCountApi} />
      );

      expect(docCountApi.getByName).not.toHaveBeenCalled();

      rerender(<DocCountCell indexName="index-a" indexStatus="open" docCountApi={docCountApi} />);

      expect(screen.getByTestId('docCountLoadingSpinner')).toBeInTheDocument();
      expect(docCountApi.getByName).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(999);
      });

      expect(docCountApi.getByName).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1);
      });

      expect(docCountApi.getByName).toHaveBeenCalledWith('index-a');
    }
  );

  it('shows the spinner instead of a stale cached count while a reopened index count reload is pending', () => {
    mockedUseObservable.mockReturnValue({
      'index-a': { status: RequestResultType.Success, count: 1000 },
    });

    const { rerender } = render(
      <DocCountCell indexName="index-a" indexStatus="closed" docCountApi={docCountApi} />
    );

    rerender(<DocCountCell indexName="index-a" indexStatus="open" docCountApi={docCountApi} />);

    expect(screen.getByTestId('docCountLoadingSpinner')).toBeInTheDocument();
    expect(screen.queryByText(Number(1000).toLocaleString())).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(docCountApi.getByName).toHaveBeenCalledWith('index-a');
  });

  it.each(['opening', 'opening...'])(
    'shows a spinner and requests the count when the index status is %s',
    (indexStatus) => {
      mockedUseObservable.mockReturnValue(undefined);

      render(
        <DocCountCell indexName="index-a" indexStatus={indexStatus} docCountApi={docCountApi} />
      );

      expect(docCountApi.getByName).toHaveBeenCalledWith('index-a');
      expect(screen.getByTestId('docCountLoadingSpinner')).toBeInTheDocument();
    }
  );

  it('renders an error label when the index count failed to load', () => {
    mockedUseObservable.mockReturnValue({
      'index-a': { status: RequestResultType.Error },
    });

    render(<DocCountCell indexName="index-a" docCountApi={docCountApi} />);

    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('renders the formatted count when available', () => {
    mockedUseObservable.mockReturnValue({
      'index-a': { status: RequestResultType.Success, count: 1000 },
    });

    render(<DocCountCell indexName="index-a" docCountApi={docCountApi} />);

    expect(screen.getByText(Number(1000).toLocaleString())).toBeInTheDocument();
  });
});
