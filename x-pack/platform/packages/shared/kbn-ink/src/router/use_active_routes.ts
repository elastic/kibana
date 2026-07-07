/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import useObservable from 'react-use/lib/useObservable';
import { useInkRouteContext } from './route_context';
import type { ActiveRouteObject, RouteHandle } from './types';

/**
 * Returns the currently active (as in, being rendered) routes.
 */
export function useActiveRoutes<
  THandle extends RouteHandle | undefined = RouteHandle | undefined
>(): ActiveRouteObject<THandle>[] {
  const { active$ } = useInkRouteContext<THandle>();

  const active = useObservable(active$, []);

  return active;
}
