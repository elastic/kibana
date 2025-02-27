/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PropsWithChildren } from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { TestQueryRowTable } from './test_query_row_table';

const AppWrapper = React.memo<PropsWithChildren<unknown>>(({ children }) => (
  <I18nProvider>{children}</I18nProvider>
));

describe('TestQueryRow', () => {
  it('should render the datagrid', () => {
    render(
      <TestQueryRowTable
        rawResults={{
          cols: [
            {
              id: 'test',
            },
          ],
          rows: [
            {
              test: 'esql query 1',
            },
            {
              test: 'esql query 2',
            },
          ],
        }}
        alerts={null}
      />,
      {
        wrapper: AppWrapper,
      }
    );

    expect(screen.getByTestId('test-query-row-datagrid')).toBeInTheDocument();
    expect(screen.getAllByTestId('dataGridRowCell')).toHaveLength(2);
    expect(screen.queryByText('Alerts generated')).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('alert-badge')).toHaveLength(0);
  });

  it('should render the datagrid and alerts if provided', () => {
    render(
      <TestQueryRowTable
        rawResults={{
          cols: [
            {
              id: 'test',
            },
          ],
          rows: [
            {
              test: 'esql query 1',
            },
            {
              test: 'esql query 2',
            },
          ],
        }}
        alerts={['alert1', 'alert2']}
      />,
      {
        wrapper: AppWrapper,
      }
    );

    expect(screen.getByTestId('test-query-row-datagrid')).toBeInTheDocument();
    expect(screen.getAllByTestId('dataGridRowCell')).toHaveLength(2);
    expect(screen.getByText('Alerts generated')).toBeInTheDocument();
    expect(screen.getAllByTestId('alert-badge')).toHaveLength(2);
  });

  it('should render the datagrid if values are undefined', () => {
    render(
      <TestQueryRowTable
        rawResults={{
          cols: [
            {
              id: 'test',
            },
          ],
          rows: [
            {
              test: undefined,
            },
            {
              test: undefined,
            },
          ],
        }}
        alerts={null}
      />,
      {
        wrapper: AppWrapper,
      }
    );

    expect(screen.getByTestId('test-query-row-datagrid')).toBeInTheDocument();
    expect(screen.getAllByTestId('dataGridRowCell')).toHaveLength(2);
    expect(screen.queryByText('Alerts generated')).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('alert-badge')).toHaveLength(0);
  });
});
