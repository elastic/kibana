/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ApiActions {
  get(operation: ApiOperation, subject: string): string;

  /**
   * @deprecated use `get(operation: ApiOperation, subject: string)` instead
   */
  get(subject: string): string;
  actionFromRouteTag(routeTag: string): string;
}

export enum ApiOperation {
  Read = 'read',
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
  Manage = 'manage',
}
