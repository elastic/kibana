/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DARK_THEME } from '@elastic/charts';
import numeral from '@elastic/numeral';
import { HttpHandler } from '@kbn/core-http-browser';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { EMPTY_STAT } from '../../helpers';
import { mockMappingsResponse } from '../../mock/mappings_response/mock_mappings_response';
import { auditbeatWithAllResults } from '../../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { mockUnallowedValuesResponse } from '../../mock/unallowed_values/mock_unallowed_values';
import { LOADING_MAPPINGS, LOADING_UNALLOWED_VALUES } from './translations';
import { UnallowedValueRequestItem } from '../../types';
import { IndexProperties, Props } from '.';

const defaultBytesFormat = '0,0.[0]b';
const formatBytes = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

const defaultNumberFormat = '0,0.[000]';
const formatNumber = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

const pattern = 'auditbeat-*';
const patternRollup = auditbeatWithAllResults;

const mockFetchMappings = jest.fn(
  ({
    abortController,
    httpFetch,
    patternOrIndexName,
  }: {
    abortController: AbortController;
    httpFetch: HttpHandler;
    patternOrIndexName: string;
  }) =>
    new Promise((resolve) => {
      resolve(mockMappingsResponse); // happy path
    })
);

jest.mock('../../use_mappings/helpers', () => ({
  fetchMappings: ({
    abortController,
    httpFetch,
    patternOrIndexName,
  }: {
    abortController: AbortController;
    httpFetch: HttpHandler;
    patternOrIndexName: string;
  }) =>
    mockFetchMappings({
      abortController,
      httpFetch,
      patternOrIndexName,
    }),
}));

const mockFetchUnallowedValues = jest.fn(
  ({
    abortController,
    httpFetch,
    indexName,
    requestItems,
  }: {
    abortController: AbortController;
    httpFetch: HttpHandler;
    indexName: string;
    requestItems: UnallowedValueRequestItem[];
  }) => new Promise((resolve) => resolve(mockUnallowedValuesResponse))
);

jest.mock('../../use_unallowed_values/helpers', () => {
  const original = jest.requireActual('../../use_unallowed_values/helpers');

  return {
    ...original,
    fetchUnallowedValues: ({
      abortController,
      httpFetch,
      indexName,
      requestItems,
    }: {
      abortController: AbortController;
      httpFetch: HttpHandler;
      indexName: string;
      requestItems: UnallowedValueRequestItem[];
    }) =>
      mockFetchUnallowedValues({
        abortController,
        httpFetch,
        indexName,
        requestItems,
      }),
  };
});

const defaultProps: Props = {
  addSuccessToast: jest.fn(),
  canUserCreateAndReadCases: jest.fn(),
  docsCount: auditbeatWithAllResults.docsCount ?? 0,
  formatBytes,
  formatNumber,
  getGroupByFieldsOnClick: jest.fn(),
  indexId: '1xxx',
  ilmPhase: 'hot',
  indexName: 'auditbeat-custom-index-1',
  isAssistantEnabled: true,
  openCreateCaseFlyout: jest.fn(),
  pattern,
  patternRollup,
  baseTheme: DARK_THEME,
  updatePatternRollup: jest.fn(),
};

describe('IndexProperties', () => {
  test('it renders the tab content', async () => {
    render(
      <TestProviders>
        <IndexProperties {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('incompatibleTab')).toBeInTheDocument();
    });
  });

  describe('when an error occurs loading mappings', () => {
    const abortController = new AbortController();
    abortController.abort();

    const error = 'simulated fetch mappings error';

    beforeEach(() => {
      jest.resetAllMocks();
    });

    test('it displays the expected empty prompt content', async () => {
      mockFetchMappings.mockImplementation(
        ({
          // eslint-disable-next-line @typescript-eslint/no-shadow
          abortController,
          patternOrIndexName,
        }: {
          abortController: AbortController;
          patternOrIndexName: string;
        }) => new Promise((_, reject) => reject(new Error(error)))
      );

      render(
        <TestProviders>
          <IndexProperties {...defaultProps} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(
          screen
            .getByTestId('errorEmptyPrompt')
            .textContent?.includes('Unable to load index mappings')
        ).toBe(true);
      });
    });
  });

  describe('when an error occurs loading unallowed values', () => {
    const abortController = new AbortController();
    abortController.abort();

    const error = 'simulated fetch unallowed values error';

    beforeEach(() => {
      jest.resetAllMocks();
    });

    test('it displays the expected empty prompt content', async () => {
      mockFetchUnallowedValues.mockImplementation(
        ({
          // eslint-disable-next-line @typescript-eslint/no-shadow
          abortController,
          indexName,
          requestItems,
        }: {
          abortController: AbortController;
          indexName: string;
          requestItems: UnallowedValueRequestItem[];
        }) => new Promise((_, reject) => reject(new Error(error)))
      );

      render(
        <TestProviders>
          <IndexProperties {...defaultProps} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(
          screen
            .getByTestId('errorEmptyPrompt')
            .textContent?.includes('Unable to load unallowed values')
        ).toBe(true);
      });
    });
  });

  describe('when mappings are loading', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    test('it displays the expected loading prompt content', async () => {
      mockFetchMappings.mockImplementation(
        ({
          abortController,
          patternOrIndexName,
        }: {
          abortController: AbortController;
          patternOrIndexName: string;
        }) => new Promise(() => {}) // <-- will never resolve or reject
      );

      render(
        <TestProviders>
          <IndexProperties {...defaultProps} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(
          screen.getByTestId('loadingEmptyPrompt').textContent?.includes(LOADING_MAPPINGS)
        ).toBe(true);
      });
    });
  });

  describe('when unallowed values are loading', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    test('it displays the expected loading prompt content', async () => {
      mockFetchUnallowedValues.mockImplementation(
        ({
          abortController,
          indexName,
          requestItems,
        }: {
          abortController: AbortController;
          indexName: string;
          requestItems: UnallowedValueRequestItem[];
        }) => new Promise(() => {}) // <-- will never resolve or reject
      );

      render(
        <TestProviders>
          <IndexProperties {...defaultProps} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(
          screen.getByTestId('loadingEmptyPrompt').textContent?.includes(LOADING_UNALLOWED_VALUES)
        ).toBe(true);
      });
    });
  });
});
