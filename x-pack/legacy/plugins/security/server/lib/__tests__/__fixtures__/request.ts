/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import url from 'url';

interface RequestFixtureOptions {
  headers?: Record<string, string>;
  auth?: string;
  params?: Record<string, unknown>;
  path?: string;
  basePath?: string;
  search?: string;
  payload?: unknown;
}

export function requestFixture({
  headers = { accept: 'something/html' },
  auth,
  params,
  path = '/wat',
  search = '',
  payload,
}: RequestFixtureOptions = {}) {
  return ({
    raw: { req: { headers } },
    auth,
    headers,
    params,
    url: { path, search },
    query: search ? url.parse(search, true /* parseQueryString */).query : {},
    payload,
    state: { user: 'these are the contents of the user client cookie' },
    route: { settings: {} },
  } as any) as Request;
}
