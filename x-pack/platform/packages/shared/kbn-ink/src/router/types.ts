/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type RouteHandle = Record<string, any>;

export type ActiveRouteObject<THandle extends RouteHandle | undefined = RouteHandle | undefined> =
  WithHandle<
    {
      path?: string;
      params?: Record<string, string>;
    },
    THandle
  >;

export type WithHandle<
  TBase extends Record<string, any>,
  THandle extends RouteHandle | undefined = RouteHandle | undefined
> = TBase & (THandle extends RouteHandle ? { handle: THandle } : {});
