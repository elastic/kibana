/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { Outlet, type RouteProps } from 'react-router-dom-v5-compat';
import { Menu, type MenuItemProps } from '../menu/menu';
import { InkRoutes } from './ink_routes';
import { InkRoute } from './ink_route';
import { useInkRouter } from './use_ink_router';
import type { RouteHandle, WithHandle } from './types';

export interface RouteMenuDisplayItemProps extends MenuItemProps {
  path: string;
  element: React.ReactElement;
}

export interface RouteMenuActionItemProps extends MenuItemProps {
  onSelect(): void;
}

export type RouteMenuItemProps = RouteMenuDisplayItemProps | RouteMenuActionItemProps;

interface RouteMenuProps<THandle extends RouteHandle | undefined = RouteHandle | undefined> {
  label: string;
  items: WithHandle<RouteMenuItemProps, THandle>[];
}

/**
 * Renders a Menu component based on the defined routes.
 * This allows the consumer to build an interactive menu that can be nested and
 * automatically creates the right routes.
 */
export function RouteMenu<THandle extends RouteHandle | undefined = RouteHandle | undefined>({
  label,
  items,
}: RouteMenuProps<THandle>): React.ReactElement {
  const { go, back } = useInkRouter();

  const menuItems = useMemo<MenuItemProps[]>(() => {
    return items.map((item): MenuItemProps => {
      return {
        label: item.label,
        description: item.description,
      };
    });
  }, [items]);

  const subRoutes: Array<RouteProps & { key: string }> = items.flatMap((item) => {
    if (!('path' in item)) {
      return [];
    }
    return [
      {
        key: item.path,
        // make sure this is a wildcard match. without, react-router will only render
        // the exact match
        path: item.path + '/*',
        handle: 'handle' in item ? item.handle : undefined,
        element: 'element' in item ? item.element : undefined,
      },
    ];
  });

  subRoutes.unshift({
    key: 'index',
    index: true,
    element: (
      <Menu
        items={menuItems}
        label={label}
        onSelect={(selectedItem) => {
          const routeItem = items.find((item) => item.label === selectedItem.label);
          const pathForItem = routeItem && 'path' in routeItem ? routeItem.path : undefined;

          if (pathForItem) {
            go(pathForItem);
          } else if (routeItem && 'onSelect' in routeItem) {
            routeItem.onSelect();
          }
        }}
        onBack={() => {
          back();
        }}
      />
    ),
  });

  return (
    <InkRoutes>
      <InkRoute element={<Outlet />}>
        {subRoutes.map((routeProps) => (
          <InkRoute {...routeProps} />
        ))}
      </InkRoute>
    </InkRoutes>
  );
}
