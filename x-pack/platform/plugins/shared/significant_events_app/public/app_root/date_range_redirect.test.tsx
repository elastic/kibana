/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { useKibana } from '../hooks/use_kibana';
import { DateRangeRedirect } from './date_range_redirect';

jest.mock('../hooks/use_kibana');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const renderRedirect = (path: string) => {
  const history = createMemoryHistory({ initialEntries: [path] });
  render(
    <Router history={history}>
      <DateRangeRedirect>
        <div />
      </DateRangeRedirect>
    </Router>
  );
  return history;
};

describe('DateRangeRedirect', () => {
  beforeEach(() => {
    mockUseKibana.mockReturnValue({
      dependencies: {
        start: {
          data: {
            query: {
              timefilter: {
                timefilter: {
                  getTime: jest.fn().mockReturnValue({ from: 'now-15m', to: 'now' }),
                  isTimeTouched: jest.fn().mockReturnValue(false),
                  setTime: jest.fn(),
                },
              },
            },
          },
        },
      },
    } as never);
  });

  it('leaves the standalone Settings URL unchanged', () => {
    const history = renderRedirect('/settings');

    expect(history.location.search).toBe('');
  });

  it('removes date range params from Settings while preserving other query params', () => {
    const history = renderRedirect(
      '/settings?rangeFrom=now-24h&rangeTo=now&selectedItem=maintenance'
    );

    expect(history.location.search).toBe('?selectedItem=maintenance');
  });

  it('continues adding the default range to management routes', () => {
    const history = renderRedirect('/streams');

    expect(history.location.search).toBe('?rangeFrom=now-24h&rangeTo=now');
  });
});
