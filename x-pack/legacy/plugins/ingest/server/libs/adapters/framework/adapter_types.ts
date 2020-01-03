/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/no-empty-interface */

import { Lifecycle, ResponseToolkit } from 'hapi';
import * as t from 'io-ts';
import { Cluster, ClusterConfig } from 'src/legacy/core_plugins/elasticsearch';
import { ApmOssPlugin } from 'src/legacy/core_plugins/apm_oss';
import { Request, Server } from 'src/legacy/server/kbn_server';
import { XPackInfo } from '../../../../../xpack_main/server/lib/xpack_info';
import {
  Feature,
  FeatureWithAllOrReadPrivileges,
} from '../../../../../../../plugins/features/server';
import { SecurityPlugin } from '../../../../../security';

export const internalAuthData = Symbol('internalAuthData');
export const internalUser: FrameworkInternalUser = {
  kind: 'internal',
};

export interface KibanaLegacyServer extends Server {
  plugins: {
    xpack_main: {
      status: {
        on: (status: 'green' | 'yellow' | 'red', callback: () => void) => void;
      };
      info: XPackInfo;
      createXPackInfo(options: any): any;
      getFeatures(): Feature[];
      registerFeature(feature: FeatureWithAllOrReadPrivileges): void;
    };
    kibana: {
      status: {
        plugin: {
          version: string;
        };
      };
    };
    security: SecurityPlugin;
    elasticsearch: {
      status: {
        on: (status: 'green' | 'yellow' | 'red', callback: () => void) => void;
      };
      getCluster(name: string): Cluster;
      createCluster(name: string, config: ClusterConfig): Cluster;
      waitUntilReady(): Promise<void>;
    };
    spaces: any;
    apm_oss: ApmOssPlugin;
    ingest: any;
  };
  expose: { (key: string, value: any): void; (obj: object): void };
  policy: () => any;
  route: (routePolicy: any) => void;
  log: (message: string) => void;
}

export const RuntimeFrameworkInfo = t.interface(
  {
    kibana: t.type({
      version: t.string,
    }),
    license: t.type({
      type: t.union([
        t.literal('oss'),
        t.literal('trial'),
        t.literal('standard'),
        t.literal('basic'),
        t.literal('gold'),
        t.literal('platinum'),
        t.literal('enterprise'),
      ]),
      expired: t.boolean,
      expiry_date_in_millis: t.number,
    }),
    security: t.type({
      enabled: t.boolean,
      available: t.boolean,
    }),
    watcher: t.type({
      enabled: t.boolean,
      available: t.boolean,
    }),
  },
  'FrameworkInfo'
);
export interface FrameworkInfo extends t.TypeOf<typeof RuntimeFrameworkInfo> {}

export const RuntimeKibanaServerRequest = t.interface(
  {
    params: t.object,
    payload: t.object,
    query: t.object,
    headers: t.type({
      authorization: t.union([t.string, t.null]),
    }),
    info: t.type({
      remoteAddress: t.string,
    }),
  },
  'KibanaServerRequest'
);

export const RuntimeKibanaUser = t.interface(
  {
    username: t.string,
    roles: t.array(t.string),
    full_name: t.union([t.null, t.string]),
    email: t.union([t.null, t.string]),
    enabled: t.boolean,
  },
  'KibanaUser'
);
export interface KibanaUser extends t.TypeOf<typeof RuntimeKibanaUser> {}

export interface FrameworkAuthenticatedUser<AuthDataType = any> {
  kind: 'authenticated';
  [internalAuthData]?: AuthDataType;
  username: string;
  roles: string[];
  full_name: string | null;
  email: string | null;
  enabled: boolean;
}

export interface FrameworkUnAuthenticatedUser {
  kind: 'unauthenticated';
}

export interface FrameworkInternalUser {
  kind: 'internal';
}

export type FrameworkUser<AuthDataType = any> =
  | FrameworkAuthenticatedUser<AuthDataType>
  | FrameworkUnAuthenticatedUser
  | FrameworkInternalUser;
export interface FrameworkRequest<KibanaServerRequestGenaric extends Partial<Request> = Request> {
  user: FrameworkUser<KibanaServerRequestGenaric['headers']>;
  headers: KibanaServerRequestGenaric['headers'];
  info: Request['info'];
  payload: KibanaServerRequestGenaric['payload'];
  params: KibanaServerRequestGenaric['params'];
  query: KibanaServerRequestGenaric['query'];
}

export interface FrameworkRoute<RouteResponse extends FrameworkResponse = any> {
  path: string;
  method: string | string[];
  vhost?: string;
  licenseRequired?: string[];
  requiredRoles?: string[];
  handler: FrameworkRouteHandler<Request, RouteResponse>;
  policy?: {};
}

export type FrameworkResponseToolkit = ResponseToolkit;

export type FrameworkRouteHandler<
  RouteRequest extends Request = any,
  RouteResponse extends FrameworkResponse = any
> = (request: FrameworkRequest<RouteRequest>, h: ResponseToolkit) => Promise<RouteResponse>;

export type FrameworkResponse = Lifecycle.ReturnValue;
