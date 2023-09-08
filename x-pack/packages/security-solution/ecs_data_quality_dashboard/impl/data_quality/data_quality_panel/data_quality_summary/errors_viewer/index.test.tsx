/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../mock/test_providers/test_providers';
import { ERROR, INDEX, PATTERN } from './translations';
import { ErrorSummary } from '../../../types';
import { ErrorsViewer } from '.';

interface ExpectedColumns {
  id: string;
  expected: string;
}

const errorSummary: ErrorSummary[] = [
  {
    pattern: '.alerts-security.alerts-default',
    indexName: null,
    error: 'Error loading stats: Error: Forbidden',
  },
  {
    error:
      'Error: Error loading unallowed values for index auditbeat-7.2.1-2023.02.13-000001: Forbidden',
    indexName: 'auditbeat-7.2.1-2023.02.13-000001',
    pattern: 'auditbeat-*',
  },
];

describe('ErrorsViewer', () => {
  const expectedColumns: ExpectedColumns[] = [
    {
      id: 'pattern',
      expected: PATTERN,
    },
    {
      id: 'indexName',
      expected: INDEX,
    },
    {
      id: 'error',
      expected: ERROR,
    },
  ];

  expectedColumns.forEach(({ id, expected }, i) => {
    test(`it renders the expected '${id}' column header`, () => {
      render(
        <TestProviders>
          <ErrorsViewer errorSummary={[]} />
        </TestProviders>
      );

      expect(screen.getByTestId(`tableHeaderCell_${id}_${i}`)).toHaveTextContent(expected);
    });
  });

  test(`it renders the expected the errors`, () => {
    render(
      <TestProviders>
        <ErrorsViewer errorSummary={errorSummary} />
      </TestProviders>
    );

    expect(
      screen
        .getAllByTestId('error')
        .map((x) => x.textContent ?? '')
        .reduce((acc, x) => acc.concat(x), '')
    ).toEqual(`${errorSummary[0].error}${errorSummary[1].error}`);
  });
});
