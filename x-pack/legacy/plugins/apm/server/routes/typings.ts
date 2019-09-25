/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import t from 'io-ts';
import { Request, ResponseToolkit } from '@hapi/hapi';
import { InternalCoreSetup } from 'src/core/server';
import { KFetchOptions } from 'ui/kfetch';
import { PickByValue, Optional } from 'utility-types';

export interface Params {
  query?: t.HasProps;
  path?: t.HasProps;
  body?: t.Any | t.HasProps;
}

type DecodeParams<TParams extends Params | undefined> = {
  [key in keyof TParams]: TParams[key] extends t.Any
    ? t.TypeOf<TParams[key]>
    : never;
};

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface Route<
  TPath extends string,
  TMethod extends HttpMethod | undefined,
  TParams extends Params | undefined,
  TReturn
> {
  path: TPath;
  method?: TMethod;
  params?: TParams;
  handler: (
    req: Request,
    params: DecodeParams<TParams>,
    h: ResponseToolkit
  ) => Promise<TReturn>;
}

export type RouteFactoryFn<
  TPath extends string,
  TMethod extends HttpMethod | undefined,
  TParams extends Params,
  TReturn
> = (core: InternalCoreSetup) => Route<TPath, TMethod, TParams, TReturn>;

export interface RouteState {
  [key: string]: {
    [key in HttpMethod]: {
      params?: Params;
      ret: any;
    };
  };
}

export interface ServerAPI<TRouteState extends RouteState> {
  _S: TRouteState;
  add<
    TPath extends string,
    TReturn,
    // default params allow them to be optional in the route configuration object
    TMethod extends HttpMethod = 'GET',
    TParams extends Params = {}
  >(
    factoryFn: RouteFactoryFn<TPath, TMethod, TParams, TReturn>
  ): ServerAPI<
    TRouteState &
      {
        [Key in TPath]: {
          [key in TMethod]: {
            ret: TReturn;
          } & (TParams extends Params ? { params: TParams } : {});
        };
      }
  >;
  init: (core: InternalCoreSetup) => void;
}

// without this, TS does not recognize possible existence of `params` in `options` below
interface NoParams<TParams extends Params> {
  params?: TParams;
}

type GetOptionalParamKeys<TParams extends Params> = keyof PickByValue<
  {
    [key in keyof TParams]: TParams[key] extends t.PartialType<any>
      ? false
      : (TParams[key] extends t.Any ? true : false);
  },
  false
>;

// this type makes the params object optional if no required props are found
type GetParams<TParams extends Params> = Exclude<
  keyof TParams,
  GetOptionalParamKeys<TParams>
> extends never
  ? NoParams<Optional<DecodeParams<TParams>>>
  : {
      params: Optional<DecodeParams<TParams>, GetOptionalParamKeys<TParams>>;
    };

export type Client<TRouteState> = <
  TPath extends keyof TRouteState & string,
  TMethod extends keyof TRouteState[TPath],
  TRouteDescription extends TRouteState[TPath][TMethod],
  TParams extends TRouteDescription extends { params: Params }
    ? TRouteDescription['params']
    : undefined,
  TReturn extends TRouteDescription extends { ret: any }
    ? TRouteDescription['ret']
    : undefined
>(
  options: Omit<KFetchOptions, 'query' | 'body' | 'pathname' | 'method'> & {
    pathname: TPath;
  } & (TMethod extends 'GET' ? { method?: TMethod } : { method: TMethod }) &
    // Makes sure params can only be set when types were defined
    (TParams extends Params
      ? GetParams<TParams>
      : NoParams<Record<string, any>>)
) => Promise<TReturn>;
