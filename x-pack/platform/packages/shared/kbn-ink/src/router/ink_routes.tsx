/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { RouteProps } from 'react-router-dom-v5-compat';
import { Route, Routes, useParams } from 'react-router-dom-v5-compat';

import { InkRoute } from './ink_route';
import { useInkRouteContext } from './route_context';
import type { RouteHandle } from './types';

type InkRouteElement = React.ReactElement<RouteProps, typeof InkRoute>;

/**
 * Traverses the children of an element, and converts any InkRoute elements
 * to Route elements, which is a requirement from react-router.
 */
function renderChildrenAsRoutes(children: React.ReactNode) {
  const allChildren = React.Children.map(children, (child) => {
    if (child && typeof child === 'object' && 'type' in child && child.type === InkRoute) {
      const { element, handle, path, children: grandChildren, ...rest } = child.props;

      return (
        <Route
          {...rest}
          path={path}
          handle={handle}
          element={<RouteMatchRegister path={path} handle={handle} element={element} />}
          children={grandChildren ? renderChildrenAsRoutes(grandChildren) : undefined}
        />
      );
    }

    return child;
  });

  return allChildren?.length === 1 ? allChildren[0] : allChildren;
}

/**
 * Registers an active route, so active routes can be tracked outside of the current route's rendering context.
 * This is useful for e.g. breadcrumbs.
 */

function RouteMatchRegister({
  path,
  handle,
  element,
}: {
  path?: string;
  handle: RouteHandle;
  element?: React.ReactNode;
}) {
  const params = useParams();
  const { register } = useInkRouteContext();

  const entryJson = JSON.stringify({ params, handle, path });

  useEffect(() => {
    const entry = JSON.parse(entryJson);

    return register(entry);
  }, [entryJson, register]);

  return element;
}

/**
 * Container to render InkRoute objects.
 */
export function InkRoutes({ children }: { children: InkRouteElement | InkRouteElement[] }) {
  return <Routes>{renderChildrenAsRoutes(children)}</Routes>;
}
