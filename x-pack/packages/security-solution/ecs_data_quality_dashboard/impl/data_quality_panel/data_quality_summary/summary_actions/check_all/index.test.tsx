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

import { mockMappingsResponse } from '../../../mock/mappings_response/mock_mappings_response';
import {
  TestDataQualityProviders,
  TestExternalProviders,
} from '../../../mock/test_providers/test_providers';
import { mockUnallowedValuesResponse } from '../../../mock/unallowed_values/mock_unallowed_values';
import { CANCEL, CHECK_ALL } from '../../../translations';
import { OnCheckCompleted, UnallowedValueRequestItem } from '../../../types';
import { CheckAll } from '.';
import { EMPTY_STAT } from '../../../constants';

const defaultBytesFormat = '0,0.[0]b';
const mockFormatBytes = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

const defaultNumberFormat = '0,0.[000]';
const mockFormatNumber = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

const mockFetchMappings = jest.fn(() =>
  Promise.resolve(
    mockMappingsResponse // happy path
  )
);

jest.mock('../../../utils/fetch_mappings', () => {
  const original = jest.requireActual('../../../utils/fetch_mappings');
  return {
    ...original,
    fetchMappings: (_: { abortController: AbortController; patternOrIndexName: string }) =>
      mockFetchMappings(),
  };
});

const mockFetchUnallowedValues = jest.fn(() => Promise.resolve(mockUnallowedValuesResponse));

jest.mock('../../../utils/fetch_unallowed_values', () => {
  const original = jest.requireActual('../../../utils/fetch_unallowed_values');
  return {
    ...original,
    fetchUnallowedValues: (_: {
      abortController: AbortController;
      indexName: string;
      requestItems: UnallowedValueRequestItem[];
    }) => mockFetchUnallowedValues(),
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
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders the expected button text when a check is NOT running', () => {
    render(
      <TestExternalProviders>
        <TestDataQualityProviders
          dataQualityContextProps={{
            ilmPhases,
            formatNumber: mockFormatNumber,
            formatBytes: mockFormatBytes,
            patterns: [],
          }}
          resultsRollupContextProps={{
            patternIndexNames,
          }}
        >
          <CheckAll
            incrementCheckAllIndiciesChecked={jest.fn()}
            setCheckAllIndiciesChecked={jest.fn()}
            setCheckAllTotalIndiciesToCheck={jest.fn()}
            setIndexToCheck={jest.fn()}
          />
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    expect(screen.getByTestId('checkAll')).toHaveTextContent(CHECK_ALL);
  });

  test('it renders a disabled button when ILM available and ilmPhases is an empty array', () => {
    render(
      <TestExternalProviders>
        <TestDataQualityProviders
          dataQualityContextProps={{
            ilmPhases: [],
            formatNumber: mockFormatNumber,
            formatBytes: mockFormatBytes,
            patterns: [],
          }}
          resultsRollupContextProps={{
            patternIndexNames,
          }}
        >
          <CheckAll
            incrementCheckAllIndiciesChecked={jest.fn()}
            setCheckAllIndiciesChecked={jest.fn()}
            setCheckAllTotalIndiciesToCheck={jest.fn()}
            setIndexToCheck={jest.fn()}
          />
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    expect(screen.getByTestId('checkAll').hasAttribute('disabled')).toBeTruthy();
  });

  test('it renders the expected button when ILM is NOT available', () => {
    render(
      <TestExternalProviders>
        <TestDataQualityProviders
          dataQualityContextProps={{
            isILMAvailable: false,
            ilmPhases: [],
            formatNumber: mockFormatNumber,
            formatBytes: mockFormatBytes,
            patterns: [],
          }}
          resultsRollupContextProps={{
            patternIndexNames,
          }}
        >
          <CheckAll
            incrementCheckAllIndiciesChecked={jest.fn()}
            setCheckAllIndiciesChecked={jest.fn()}
            setCheckAllTotalIndiciesToCheck={jest.fn()}
            setIndexToCheck={jest.fn()}
          />
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    expect(screen.getByTestId('checkAll').hasAttribute('disabled')).toBeFalsy();
  });

  test('it renders the expected button text when a check is running', async () => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <TestExternalProviders>
        <TestDataQualityProviders
          dataQualityContextProps={{
            isILMAvailable: false,
            ilmPhases,
            formatNumber: mockFormatNumber,
            formatBytes: mockFormatBytes,
            patterns: [],
          }}
          resultsRollupContextProps={{
            patternIndexNames,
          }}
        >
          <CheckAll
            incrementCheckAllIndiciesChecked={jest.fn()}
            setCheckAllIndiciesChecked={jest.fn()}
            setCheckAllTotalIndiciesToCheck={jest.fn()}
            setIndexToCheck={jest.fn()}
          />
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    const button = screen.getByTestId('checkAll');

    await user.click(button); // <-- START the check

    expect(screen.getByTestId('checkAll')).toHaveTextContent(CANCEL);
  });

  describe('formatNumber', () => {
    test('it renders a comma-separated `value` via the `defaultNumberFormat`', async () => {
      // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      /** stores the result of invoking `CheckAll`'s `formatNumber` function */
      let formatNumberResult = '';

      const onCheckCompleted: OnCheckCompleted = jest.fn(({ formatBytes, formatNumber }) => {
        const value = 123456789; // numeric input to `CheckAll`'s `formatNumber` function

        formatNumberResult = formatNumber(value);
      });

      render(
        <TestExternalProviders>
          <TestDataQualityProviders
            dataQualityContextProps={{
              isILMAvailable: false,
              ilmPhases,
              formatNumber: mockFormatNumber,
              formatBytes: mockFormatBytes,
              patterns: [],
            }}
            resultsRollupContextProps={{
              patternIndexNames,
              onCheckCompleted,
            }}
          >
            <CheckAll
              incrementCheckAllIndiciesChecked={jest.fn()}
              setCheckAllIndiciesChecked={jest.fn()}
              setCheckAllTotalIndiciesToCheck={jest.fn()}
              setIndexToCheck={jest.fn()}
            />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      const button = screen.getByTestId('checkAll');

      await user.click(button); // <-- START the check

      await waitFor(() => {
        expect(formatNumberResult).toEqual('123,456,789'); // a comma-separated `value`, because it's numeric
      });
    });

    test('it renders an empty stat placeholder when `value` is undefined', async () => {
      // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      /** stores the result of invoking `CheckAll`'s `formatNumber` function */
      let formatNumberResult = '';

      const onCheckCompleted: OnCheckCompleted = jest.fn(({ formatBytes, formatNumber }) => {
        const value = undefined; // undefined input to `CheckAll`'s `formatNumber` function
        formatNumberResult = formatNumber(value);
      });

      render(
        <TestExternalProviders>
          <TestDataQualityProviders
            dataQualityContextProps={{
              isILMAvailable: false,
              ilmPhases,
              formatNumber: mockFormatNumber,
              formatBytes: mockFormatBytes,
              patterns: [],
            }}
            resultsRollupContextProps={{
              patternIndexNames,
              onCheckCompleted,
            }}
          >
            <CheckAll
              incrementCheckAllIndiciesChecked={jest.fn()}
              setCheckAllIndiciesChecked={jest.fn()}
              setCheckAllTotalIndiciesToCheck={jest.fn()}
              setIndexToCheck={jest.fn()}
            />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      const button = screen.getByTestId('checkAll');

      await user.click(button); // <-- START the check

      await waitFor(() => {
        expect(formatNumberResult).toEqual(EMPTY_STAT); // a placeholder, because `value` is undefined
      });
    });
  });

  describe('when a running check is cancelled', () => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const setCheckAllIndiciesChecked = jest.fn();
    const setCheckAllTotalIndiciesToCheck = jest.fn();

    beforeEach(async () => {
      jest.clearAllMocks();

      render(
        <TestExternalProviders>
          <TestDataQualityProviders
            dataQualityContextProps={{
              isILMAvailable: false,
              ilmPhases,
              formatNumber: mockFormatNumber,
              formatBytes: mockFormatBytes,
              patterns: [],
            }}
            resultsRollupContextProps={{
              patternIndexNames,
            }}
          >
            <CheckAll
              incrementCheckAllIndiciesChecked={jest.fn()}
              setCheckAllIndiciesChecked={setCheckAllIndiciesChecked}
              setCheckAllTotalIndiciesToCheck={setCheckAllTotalIndiciesToCheck}
              setIndexToCheck={jest.fn()}
            />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      const button = screen.getByTestId('checkAll');

      await user.click(button); // <-- START the check

      await user.click(button); // <-- STOP the check
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
    const onCheckCompleted = jest.fn();
    beforeEach(async () => {
      jest.clearAllMocks();
      jest.useFakeTimers();

      // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestExternalProviders>
          <TestDataQualityProviders
            dataQualityContextProps={{
              isILMAvailable: false,
              ilmPhases,
              formatNumber: mockFormatNumber,
              formatBytes: mockFormatBytes,
              patterns: [],
            }}
            resultsRollupContextProps={{
              patternIndexNames,
              onCheckCompleted,
            }}
          >
            <CheckAll
              incrementCheckAllIndiciesChecked={jest.fn()}
              setCheckAllIndiciesChecked={jest.fn()}
              setCheckAllTotalIndiciesToCheck={jest.fn()}
              setIndexToCheck={setIndexToCheck}
            />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      const button = screen.getByTestId('checkAll');

      await user.click(button); // <-- start the check

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

    test('it invokes onCheckAllCompleted after all the checks have completed', () => {
      expect(onCheckCompleted).toHaveBeenCalled();
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
