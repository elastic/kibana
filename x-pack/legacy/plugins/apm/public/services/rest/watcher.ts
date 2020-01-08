/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'kibana/public';
import { callApi } from './callApi';

export async function createWatch({
  id,
  watch,
  http
}: {
  http: HttpSetup;
  id: string;
  watch: any;
}) {
  return callApi(http, {
    method: 'PUT',
    pathname: `/api/watcher/watch/${id}`,
    body: { type: 'json', id, watch }
  });
}
