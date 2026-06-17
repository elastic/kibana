/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect as mockUseEffect } from 'react';
import { render } from '@testing-library/react';
import { useLocation } from 'react-router-dom-v5-compat';
import { InkRouter } from './ink_router';
import { InkRoutes } from './ink_routes';
import { InkRoute } from './ink_route';
import { RouteMenu } from './route_menu';

jest.mock('ink', () => {
  return {
    useApp: () => ({ exit: jest.fn() }),
    useInput: jest.fn(),
  };
});

// Mock the Menu component to immediately trigger onSelect with the first item.
jest.mock('../menu/menu', () => {
  return {
    Menu: ({
      items,
      label,
      onSelect,
    }: {
      items: Array<{ label: string }>;
      label: string;
      onSelect: (item: { label: string }) => void;
    }) => {
      mockUseEffect(() => {
        // simulate a selection of the first item
        if (items.length > 0) {
          onSelect(items[0]);
        }
      }, []);

      return (
        <div data-test-subj="menu">
          <div data-test-subj="menu-label">{label}</div>
          <ul>
            {items.map((i) => (
              <li key={i.label}>{i.label}</li>
            ))}
          </ul>
        </div>
      );
    },
  };
});

function ShowLocation() {
  const loc = useLocation();
  return <div data-test-subj="loc">{loc.pathname}</div>;
}

describe('RouteMenu', () => {
  it('navigates using a relative path item', async () => {
    const { findByTestId } = render(
      <InkRouter initialPath="/">
        {/* Render the menu, which internally provides its own InkRoutes */}
        <RouteMenu
          label="Root Menu"
          items={[
            {
              label: 'Child',
              path: 'child',
              element: <div data-test-subj="child">child</div>,
            },
          ]}
        />
        {/* Separate route tree to observe current location */}
        <InkRoutes>
          <InkRoute path="*" element={<ShowLocation />} />
        </InkRoutes>
      </InkRouter>
    );

    const loc = await findByTestId('loc');
    expect(loc.textContent).toBe('/child');
    const child = await findByTestId('child');
    expect(child.textContent).toBe('child');
  });

  it('navigates using an absolute path item', async () => {
    const { findByTestId } = render(
      <InkRouter initialPath="/">
        <RouteMenu
          label="Root Menu"
          items={[
            {
              label: 'Absolute',
              path: '/absolute',
              element: <div data-test-subj="absolute">absolute</div>,
            },
          ]}
        />
        <InkRoutes>
          <InkRoute path="*" element={<ShowLocation />} />
        </InkRoutes>
      </InkRouter>
    );

    const loc = await findByTestId('loc');
    expect(loc.textContent).toBe('/absolute');
    const abs = await findByTestId('absolute');
    expect(abs.textContent).toBe('absolute');
  });

  it('supports action items without a path', async () => {
    const onSelect = jest.fn();

    render(
      <InkRouter initialPath="/">
        <RouteMenu
          label="Root Menu"
          items={[
            {
              label: 'Action',
              onSelect,
            },
          ]}
        />
      </InkRouter>
    );

    expect(onSelect.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
