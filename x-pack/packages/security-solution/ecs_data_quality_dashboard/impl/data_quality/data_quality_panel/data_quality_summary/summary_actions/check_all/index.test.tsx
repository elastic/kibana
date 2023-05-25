/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import userEvent from '@testing-library/user-event';
import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { mockMappingsResponse } from '../../../../mock/mappings_response/mock_mappings_response';
import { TestProviders } from '../../../../mock/test_providers/test_providers';
import { mockUnallowedValuesResponse } from '../../../../mock/unallowed_values/mock_unallowed_values';
import { CANCEL, CHECK_ALL } from '../../../../translations';
import {
  OnCheckCompleted,
  PartitionedFieldMetadata,
  UnallowedValueRequestItem,
} from '../../../../types';
import { CheckAll } from '.';
import { EMPTY_STAT } from '../../../../helpers';

const defaultBytesFormat = '0,0.[0]b';
const mockFormatBytes = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

const defaultNumberFormat = '0,0.[000]';
const mockFormatNumber = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

const mockFetchMappings = jest.fn(
  ({
    abortController,
    patternOrIndexName,
  }: {
    abortController: AbortController;
    patternOrIndexName: string;
  }) =>
    new Promise((resolve) => {
      resolve(mockMappingsResponse); // happy path
    })
);

jest.mock('../../../../use_mappings/helpers', () => ({
  fetchMappings: ({
    abortController,
    patternOrIndexName,
  }: {
    abortController: AbortController;
    patternOrIndexName: string;
  }) =>
    mockFetchMappings({
      abortController,
      patternOrIndexName,
    }),
}));

const mockFetchUnallowedValues = jest.fn(
  ({
    abortController,
    indexName,
    requestItems,
  }: {
    abortController: AbortController;
    indexName: string;
    requestItems: UnallowedValueRequestItem[];
  }) => new Promise((resolve) => resolve(mockUnallowedValuesResponse))
);

jest.mock('../../../../use_unallowed_values/helpers', () => {
  const original = jest.requireActual('../../../../use_unallowed_values/helpers');

  return {
    ...original,
    fetchUnallowedValues: ({
      abortController,
      indexName,
      requestItems,
    }: {
      abortController: AbortController;
      indexName: string;
      requestItems: UnallowedValueRequestItem[];
    }) =>
      mockFetchUnallowedValues({
        abortController,
        indexName,
        requestItems,
      }),
  };
});

const patternIndexNames = {
  '.alerts-security.alerts-default': ['.internal.alerts-security.alerts-default-000001'],
  'auditbeat-*': [
    'auditbeat-7.3.2-2023.03.27-000001',
    '.ds-auditbeat-8.6.1-2023.03.29-000001',
    'auditbeat-custom-empty-index-1',
    'auditbeat-7.10.2-2023.03.27-000001',
    'auditbeat-7.2.1-2023.03.27-000001',
    'auditbeat-custom-index-1',
  ],
  'logs-*': [
    '.ds-logs-endpoint.events.process-default-2023.03.27-000001',
    '.ds-logs-endpoint.alerts-default-2023.03.27-000001',
  ],
  'packetbeat-*': [
    '.ds-packetbeat-8.6.1-2023.03.27-000001',
    '.ds-packetbeat-8.5.3-2023.03.27-000001',
  ],
};

const ilmPhases: string[] = ['hot', 'warm', 'unmanaged'];

describe('CheckAll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders the expected button text when a check is NOT running', () => {
    render(
      <TestProviders>
        <CheckAll
          formatBytes={mockFormatBytes}
          formatNumber={mockFormatNumber}
          ilmPhases={ilmPhases}
          incrementCheckAllIndiciesChecked={jest.fn()}
          onCheckCompleted={jest.fn()}
          patternIndexNames={patternIndexNames}
          patterns={[]}
          setCheckAllIndiciesChecked={jest.fn()}
          setCheckAllTotalIndiciesToCheck={jest.fn()}
          setIndexToCheck={jest.fn()}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('checkAll')).toHaveTextContent(CHECK_ALL);
  });

  test('it renders the expected button text when a check is running', () => {
    render(
      <TestProviders>
        <CheckAll
          formatBytes={mockFormatBytes}
          formatNumber={mockFormatNumber}
          ilmPhases={ilmPhases}
          incrementCheckAllIndiciesChecked={jest.fn()}
          onCheckCompleted={jest.fn()}
          patternIndexNames={patternIndexNames}
          patterns={[]}
          setCheckAllIndiciesChecked={jest.fn()}
          setCheckAllTotalIndiciesToCheck={jest.fn()}
          setIndexToCheck={jest.fn()}
        />
      </TestProviders>
    );

    const button = screen.getByTestId('checkAll');

    userEvent.click(button); // <-- START the check

    expect(screen.getByTestId('checkAll')).toHaveTextContent(CANCEL);
  });

  describe('formatNumber', () => {
    test('it renders a comma-separated `value` via the `defaultNumberFormat`', async () => {
      /** stores the result of invoking `CheckAll`'s `formatNumber` function */
      let formatNumberResult = '';

      const onCheckCompleted: OnCheckCompleted = jest.fn(
        ({
          formatBytes,
          formatNumber,
        }: {
          error: string | null;
          formatBytes: (value: number | undefined) => string;
          formatNumber: (value: number | undefined) => string;
          indexName: string;
          partitionedFieldMetadata: PartitionedFieldMetadata | null;
          pattern: string;
          version: string;
        }) => {
          const value = 123456789; // numeric input to `CheckAll`'s `formatNumber` function

          formatNumberResult = formatNumber(value);
        }
      );

      render(
        <TestProviders>
          <CheckAll
            formatBytes={mockFormatBytes}
            formatNumber={mockFormatNumber}
            ilmPhases={ilmPhases}
            incrementCheckAllIndiciesChecked={jest.fn()}
            onCheckCompleted={onCheckCompleted}
            patternIndexNames={patternIndexNames}
            patterns={[]}
            setCheckAllIndiciesChecked={jest.fn()}
            setCheckAllTotalIndiciesToCheck={jest.fn()}
            setIndexToCheck={jest.fn()}
          />
        </TestProviders>
      );

      const button = screen.getByTestId('checkAll');

      userEvent.click(button); // <-- START the check

      await waitFor(() => {
        expect(formatNumberResult).toEqual('123,456,789'); // a comma-separated `value`, because it's numeric
      });
    });

    test('it renders an empty stat placeholder when `value` is undefined', async () => {
      /** stores the result of invoking `CheckAll`'s `formatNumber` function */
      let formatNumberResult = '';

      const onCheckCompleted: OnCheckCompleted = jest.fn(
        ({
          formatBytes,
          formatNumber,
        }: {
          error: string | null;
          formatBytes: (value: number | undefined) => string;
          formatNumber: (value: number | undefined) => string;
          indexName: string;
          partitionedFieldMetadata: PartitionedFieldMetadata | null;
          pattern: string;
          version: string;
        }) => {
          const value = undefined; // undefined input to `CheckAll`'s `formatNumber` function

          formatNumberResult = formatNumber(value);
        }
      );

      render(
        <TestProviders>
          <CheckAll
            formatBytes={mockFormatBytes}
            formatNumber={mockFormatNumber}
            ilmPhases={ilmPhases}
            incrementCheckAllIndiciesChecked={jest.fn()}
            onCheckCompleted={onCheckCompleted}
            patternIndexNames={patternIndexNames}
            patterns={[]}
            setCheckAllIndiciesChecked={jest.fn()}
            setCheckAllTotalIndiciesToCheck={jest.fn()}
            setIndexToCheck={jest.fn()}
          />
        </TestProviders>
      );

      const button = screen.getByTestId('checkAll');

      userEvent.click(button); // <-- START the check

      await waitFor(() => {
        expect(formatNumberResult).toEqual(EMPTY_STAT); // a placeholder, because `value` is undefined
      });
    });
  });

  describe('when a running check is cancelled', () => {
    const setCheckAllIndiciesChecked = jest.fn();
    const setCheckAllTotalIndiciesToCheck = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();

      render(
        <TestProviders>
          <CheckAll
            formatBytes={mockFormatBytes}
            formatNumber={mockFormatNumber}
            ilmPhases={ilmPhases}
            incrementCheckAllIndiciesChecked={jest.fn()}
            onCheckCompleted={jest.fn()}
            patternIndexNames={patternIndexNames}
            patterns={[]}
            setCheckAllIndiciesChecked={setCheckAllIndiciesChecked}
            setCheckAllTotalIndiciesToCheck={setCheckAllTotalIndiciesToCheck}
            setIndexToCheck={jest.fn()}
          />
        </TestProviders>
      );

      const button = screen.getByTestId('checkAll');

      userEvent.click(button); // <-- START the check

      userEvent.click(button); // <-- STOP the check
    });

    test('it invokes `setCheckAllIndiciesChecked` twice: when the check was started, and when it was cancelled', () => {
      expect(setCheckAllIndiciesChecked).toHaveBeenCalledTimes(2);
    });

    test('it invokes `setCheckAllTotalIndiciesToCheck` with the expected index count when the check is STARTED', () => {
      expect(setCheckAllTotalIndiciesToCheck.mock.calls[0][0]).toEqual(11);
    });

    test('it invokes `setCheckAllTotalIndiciesToCheck` with the expected index count when the check is STOPPED', () => {
      expect(setCheckAllTotalIndiciesToCheck.mock.calls[1][0]).toEqual(0);
    });
  });

  describe('when all checks have completed', () => {
    const setIndexToCheck = jest.fn();

    beforeEach(async () => {
      jest.clearAllMocks();
      jest.useFakeTimers();

      render(
        <TestProviders>
          <CheckAll
            formatBytes={mockFormatBytes}
            formatNumber={mockFormatNumber}
            ilmPhases={ilmPhases}
            incrementCheckAllIndiciesChecked={jest.fn()}
            onCheckCompleted={jest.fn()}
            patternIndexNames={patternIndexNames}
            patterns={[]}
            setCheckAllIndiciesChecked={jest.fn()}
            setCheckAllTotalIndiciesToCheck={jest.fn()}
            setIndexToCheck={setIndexToCheck}
          />
        </TestProviders>
      );

      const button = screen.getByTestId('checkAll');

      userEvent.click(button); // <-- start the check

      const totalIndexNames = Object.values(patternIndexNames).reduce(
        (total, indices) => total + indices.length,
        0
      );

      // simulate the wall clock advancing
      for (let i = 0; i < totalIndexNames + 1; i++) {
        act(() => {
          jest.advanceTimersByTime(1000 * 10);
        });

        await waitFor(() => {});
      }
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('it invokes setIndexToCheck with `null` after all the checks have completed', () => {
      expect(setIndexToCheck).toBeCalledWith(null);
    });

    // test all the patterns
    Object.entries(patternIndexNames).forEach((pattern) => {
      const [patternName, indexNames] = pattern;

      // test each index in the pattern
      indexNames.forEach((indexName) => {
        test(`it invokes setIndexToCheck with the expected value for the '${patternName}' pattern's index, named '${indexName}'`, () => {
          expect(setIndexToCheck).toBeCalledWith({
            indexName,
            pattern: patternName,
          });
        });
      });
    });
  });
});
