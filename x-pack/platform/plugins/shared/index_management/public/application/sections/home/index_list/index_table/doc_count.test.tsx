/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

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
