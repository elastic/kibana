/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface BaseParams {
  basePath: string;
  dateStart: string;
  dateEnd: string;
  filters?: string;
  statusFilter?: string;
  location?: string;
}

export type APIFn<P, R = any> = (params: { basePath: string } & P) => Promise<R>;
