/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { render } from '@testing-library/react';
import { useLocation } from 'react-router-dom-v5-compat';
import { InkRouter } from './ink_router';
import { InkRoutes } from './ink_routes';
import { InkRoute } from './ink_route';
import { useInkRouter } from './use_ink_router';

const mockExit = jest.fn();

jest.mock('ink', () => {
  return {
    useApp: () => ({ exit: mockExit }),
    useInput: jest.fn(),
  };
});

function Navigator({ to }: { to?: string }) {
  const { go, back } = useInkRouter();
  const location = useLocation();

  useEffect(() => {
    if (to) {
      go(to);
    } else {
      back();
    }
    // run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div data-test-subj="loc">{location.pathname}</div>;
}

describe('useInkRouter', () => {
  beforeEach(() => {
    mockExit.mockReset();
  });

  it('navigates via go()', () => {
    const { getByTestId } = render(
      <InkRouter initialPath="/">
        <InkRoutes>
          <InkRoute path="*" element={<Navigator to="/a/b" />}>
            <InkRoute path="a/*" element={<div />}>
              <InkRoute path="b/*" />
            </InkRoute>
          </InkRoute>
        </InkRoutes>
      </InkRouter>
    );

    expect(getByTestId('loc').textContent).toBe('/a/b');
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('calls exit() when back() at top level', () => {
    render(
      <InkRouter initialPath="/">
        <InkRoutes>
          <InkRoute path="*" element={<Navigator />}>
            <InkRoute path="a/*" />
          </InkRoute>
        </InkRoutes>
      </InkRouter>
    );

    expect(mockExit).toHaveBeenCalledTimes(1);
  });

  // Basic behaviour verified above; deeper back behaviour is covered elsewhere.
});
