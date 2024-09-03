/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { EMPTY_STAT } from '../../../../../constants';
import { auditbeatWithAllResults } from '../../../../../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import {
  TestDataQualityProviders,
  TestExternalProviders,
} from '../../../../../mock/test_providers/test_providers';
import { LOADING_MAPPINGS, LOADING_UNALLOWED_VALUES } from './translations';
import { IndexProperties, Props } from '.';
import { getCheckState } from '../../../../../stub/get_check_state';

const indexName = 'auditbeat-custom-index-1';
const defaultBytesFormat = '0,0.[0]b';
const formatBytes = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

const defaultNumberFormat = '0,0.[000]';
const formatNumber = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

const pattern = 'auditbeat-*';
const patternRollup = auditbeatWithAllResults;

const defaultProps: Props = {
  docsCount: auditbeatWithAllResults.docsCount ?? 0,
  ilmPhase: 'hot',
  indexName: 'auditbeat-custom-index-1',
  pattern,
  patternRollup,
};

describe('IndexProperties', () => {
  test('it renders the tab content', async () => {
    render(
      <TestExternalProviders>
        <TestDataQualityProviders
          dataQualityContextProps={{
            formatBytes,
            formatNumber,
          }}
          indicesCheckContextProps={{
            checkState: {
              ...getCheckState(indexName),
            },
          }}
        >
          <IndexProperties {...defaultProps} />
        </TestDataQualityProviders>
      </TestExternalProviders>
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
      render(
        <TestExternalProviders>
          <TestDataQualityProviders
            dataQualityContextProps={{
              formatBytes,
              formatNumber,
            }}
            indicesCheckContextProps={{
              checkState: {
                ...getCheckState(indexName, {
                  mappingsError: new Error(error),
                }),
              },
            }}
          >
            <IndexProperties {...defaultProps} />
          </TestDataQualityProviders>
        </TestExternalProviders>
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
      render(
        <TestExternalProviders>
          <TestDataQualityProviders
            dataQualityContextProps={{
              formatBytes,
              formatNumber,
            }}
            indicesCheckContextProps={{
              checkState: {
                ...getCheckState(indexName, {
                  unallowedValuesError: new Error(error),
                }),
              },
            }}
          >
            <IndexProperties {...defaultProps} />
          </TestDataQualityProviders>
        </TestExternalProviders>
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
      render(
        <TestExternalProviders>
          <TestDataQualityProviders
            dataQualityContextProps={{
              formatBytes,
              formatNumber,
            }}
            indicesCheckContextProps={{
              checkState: {
                ...getCheckState(indexName, {
                  isLoadingMappings: true,
                }),
              },
            }}
          >
            <IndexProperties {...defaultProps} />
          </TestDataQualityProviders>
        </TestExternalProviders>
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
      render(
        <TestExternalProviders>
          <TestDataQualityProviders
            dataQualityContextProps={{
              formatBytes,
              formatNumber,
            }}
            indicesCheckContextProps={{
              checkState: {
                ...getCheckState(indexName, {
                  isLoadingUnallowedValues: true,
                }),
              },
            }}
          >
            <IndexProperties {...defaultProps} />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      await waitFor(() => {
        expect(
          screen.getByTestId('loadingEmptyPrompt').textContent?.includes(LOADING_UNALLOWED_VALUES)
        ).toBe(true);
      });
    });
  });
});
