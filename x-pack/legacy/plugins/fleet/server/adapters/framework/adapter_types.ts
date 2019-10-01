/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { ResponseToolkit, ResponseObject } from 'hapi';
import { Request } from 'src/legacy/server/kbn_server';

export type KibanaLegacyServer = Legacy.Server;

export interface FrameworkAdapter {
  getSetting(settingPath: string): string;
  getServerInfo(): {
    protocol: string;
  };
}

export interface FrameworkRequest<KibanaServerRequestGenaric extends Partial<Request> = any> {
  query: KibanaServerRequestGenaric['query'];
  params: KibanaServerRequestGenaric['params'];
  payload: KibanaServerRequestGenaric['payload'];
  headers: KibanaServerRequestGenaric['headers'];
  user: FrameworkUser;
}

export type FrameworkResponseToolkit = ResponseToolkit;

export type FrameworkResponseObject = ResponseObject;

export const internalAuthData = Symbol('internalAuthData');
export const internalUser: FrameworkInternalUser = {
  kind: 'internal',
};

export interface FrameworkAuthenticatedUser<AuthDataType = any> {
  kind: 'authenticated';
  [internalAuthData]: AuthDataType;
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

export interface FrameworkRoute<
  RouteRequest extends FrameworkRequest = FrameworkRequest,
  RouteResponse extends ResponseObject = any
> {
  path: string;
  method: string | string[];
  vhost?: string;
  licenseRequired?: string[];
  requiredRoles?: string[];
  handler: (request: RouteRequest, h: FrameworkResponseToolkit) => RouteResponse;
  config?: {};
}
