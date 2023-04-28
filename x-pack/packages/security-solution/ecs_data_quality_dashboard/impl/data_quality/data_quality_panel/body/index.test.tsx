/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DARK_THEME } from '@elastic/charts';
import numeral from '@elastic/numeral';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { EMPTY_STAT } from '../../helpers';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { Body } from '.';

const defaultBytesFormat = '0,0.[0]b';
const formatBytes = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

const defaultNumberFormat = '0,0.[000]';
const formatNumber = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

const ilmPhases: string[] = ['hot', 'warm', 'unmanaged'];

describe('IndexInvalidValues', () => {
  test('it renders the data quality summary', () => {
    render(
      <TestProviders>
        <Body
          addSuccessToast={jest.fn()}
          canUserCreateAndReadCases={jest.fn()}
          formatBytes={formatBytes}
          formatNumber={formatNumber}
          getGroupByFieldsOnClick={jest.fn()}
          ilmPhases={[]}
          lastChecked={''}
          openCreateCaseFlyout={jest.fn()}
          patterns={[]}
          setLastChecked={jest.fn()}
          theme={DARK_THEME}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('dataQualitySummary')).toBeInTheDocument();
  });

  describe('patterns', () => {
    const patterns = ['.alerts-security.alerts-default', 'auditbeat-*', 'logs-*', 'packetbeat-*'];

    patterns.forEach((pattern) => {
      test(`it renders the '${pattern}' pattern`, () => {
        render(
          <TestProviders>
            <Body
              addSuccessToast={jest.fn()}
              canUserCreateAndReadCases={jest.fn()}
              formatBytes={formatBytes}
              formatNumber={formatNumber}
              getGroupByFieldsOnClick={jest.fn()}
              ilmPhases={ilmPhases}
              lastChecked={''}
              openCreateCaseFlyout={jest.fn()}
              patterns={patterns}
              setLastChecked={jest.fn()}
              theme={DARK_THEME}
            />
          </TestProviders>
        );

        expect(screen.getByTestId(`${pattern}PatternPanel`)).toBeInTheDocument();
      });
    });

    test('it renders the expected number of spacers', async () => {
      render(
        <TestProviders>
          <Body
            addSuccessToast={jest.fn()}
            canUserCreateAndReadCases={jest.fn()}
            formatBytes={formatBytes}
            formatNumber={formatNumber}
            getGroupByFieldsOnClick={jest.fn()}
            ilmPhases={ilmPhases}
            lastChecked={''}
            openCreateCaseFlyout={jest.fn()}
            patterns={patterns}
            setLastChecked={jest.fn()}
            theme={DARK_THEME}
          />
        </TestProviders>
      );

      const items = await screen.findAllByTestId('bodyPatternSpacer');
      expect(items).toHaveLength(patterns.length - 1);
    });
  });
});
