/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { InkRoute } from './src/router/ink_route';
export { InkRoutes } from './src/router/ink_routes';
export { InkRouter } from './src/router/ink_router';
export {
  RouteMenu,
  type RouteMenuActionItemProps,
  type RouteMenuDisplayItemProps,
  type RouteMenuItemProps,
} from './src/router/route_menu';

export { useGoBack } from './src/router/use_go_back';
export { useInkRouter } from './src/router/use_ink_router';

export { useActiveRoutes } from './src/router/use_active_routes';
export type { ActiveRouteObject } from './src/router/types';
