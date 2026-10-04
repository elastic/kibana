/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { EuiComboBoxProps } from '@elastic/eui';
import { IndicesSelector } from './indices_selector';

const mockGetMatchingIndices = jest.fn();
const mockGetMatchingDataStreams = jest.fn();

jest.mock('../../../../services/api', () => ({
  getMatchingIndices: (...args: unknown[]) => mockGetMatchingIndices(...args),
  getMatchingDataStreams: (...args: unknown[]) => mockGetMatchingDataStreams(...args),
}));

jest.mock('../../../../../shared_imports', () => ({
  getFieldValidityAndErrorMessage: () => ({
    isInvalid: false,
    errorMessage: undefined,
  }),
}));

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');

  return {
    ...actual,
    EuiFormRow: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    EuiComboBox: ({
      isLoading,
      onSearchChange,
      options,
    }: EuiComboBoxProps<string> & { onSearchChange: (search: string) => Promise<void> }) => (
      <div>
        <button
          type="button"
          onClick={() => void onSearchChange('older-search').catch(() => undefined)}
        >
          older-search
        </button>
        <button
          type="button"
          onClick={() => void onSearchChange('newer-search').catch(() => undefined)}
        >
          newer-search
        </button>
        <div data-test-subj="comboBoxLoading">{String(isLoading)}</div>
        <div data-test-subj="comboBoxOptions">{JSON.stringify(options)}</div>
      </div>
    ),
  };
});

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;

  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return {
    promise,
    resolve,
  };
};

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('IndicesSelector', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('keeps only the latest async search results when an older request resolves later', async () => {
    const olderDataStreams = createDeferred<{ data: { dataStreams: string[] } }>();
    const newerDataStreams = createDeferred<{ data: { dataStreams: string[] } }>();

    mockGetMatchingIndices.mockResolvedValue({ data: { indices: [] } });
    mockGetMatchingDataStreams.mockImplementation((pattern: string) => {
      return pattern === 'older-search' ? olderDataStreams.promise : newerDataStreams.promise;
    });

    render(
      <IndicesSelector
        field={{
          label: 'Source',
          value: ['existing-index'],
          setValue: jest.fn(),
        }}
        euiFieldProps={{}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'older-search' }));
    fireEvent.click(screen.getByRole('button', { name: 'newer-search' }));

    expect(screen.getByTestId('comboBoxLoading')).toHaveTextContent('true');
    expect(screen.getByTestId('comboBoxOptions')).toHaveTextContent('[]');

    await act(async () => {
      newerDataStreams.resolve({ data: { dataStreams: ['newer-stream'] } });
      await flushMicrotasks();
    });

    expect(screen.getByTestId('comboBoxLoading')).toHaveTextContent('false');
    expect(screen.getByTestId('comboBoxOptions')).toHaveTextContent('newer-stream');
    expect(screen.getByTestId('comboBoxOptions')).not.toHaveTextContent('older-stream');

    await act(async () => {
      olderDataStreams.resolve({ data: { dataStreams: ['older-stream'] } });
      await flushMicrotasks();
    });

    expect(screen.getByTestId('comboBoxLoading')).toHaveTextContent('false');
    expect(screen.getByTestId('comboBoxOptions')).toHaveTextContent('newer-stream');
    expect(screen.getByTestId('comboBoxOptions')).not.toHaveTextContent('older-stream');
  });

  it('clears the loading state when the latest async search fails', async () => {
    mockGetMatchingIndices.mockResolvedValue({ data: { indices: [] } });
    mockGetMatchingDataStreams.mockRejectedValue(new Error('request failed'));

    render(
      <IndicesSelector
        field={{
          label: 'Source',
          value: ['existing-index'],
          setValue: jest.fn(),
        }}
        euiFieldProps={{}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'newer-search' }));

    expect(screen.getByTestId('comboBoxLoading')).toHaveTextContent('true');

    await act(async () => {
      await flushMicrotasks();
    });

    expect(screen.getByTestId('comboBoxLoading')).toHaveTextContent('false');
    expect(screen.getByTestId('comboBoxOptions')).toHaveTextContent('[]');
  });
});
