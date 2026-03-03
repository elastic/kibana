/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Link, Outlet } from 'react-router-dom-v5-compat';
import { InkRouter } from './ink_router';
import { InkRoutes } from './ink_routes';
import { InkRoute } from './ink_route';
import { useActiveRoutes } from './use_active_routes';

jest.mock('ink', () => {
  return {
    useApp: () => ({ exit: jest.fn() }),
    useInput: jest.fn(),
  };
});

function ShowActive() {
  const active = useActiveRoutes();
  return (
    <ul data-test-subj="active">
      {active.map((a, i) => (
        <li key={i}>{`${a.path ?? ''}:${a.params ? JSON.stringify(a.params) : ''}`}</li>
      ))}
    </ul>
  );
}

describe('useActiveRoutes', () => {
  it('tracks the currently rendered routes', async () => {
    const { findByTestId } = render(
      <InkRouter initialPath="/top/nested">
        <InkRoutes>
          <InkRoute element={<Outlet />}>
            <InkRoute
              path="top/*"
              element={
                <>
                  <ShowActive />
                  <Link to="nested">go</Link>
                </>
              }
            />
          </InkRoute>
        </InkRoutes>
      </InkRouter>
    );

    const list = await findByTestId('active');
    expect(list.textContent).toContain('top/*:');
  });
});
