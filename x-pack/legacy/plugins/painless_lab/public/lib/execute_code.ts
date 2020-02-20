/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { API_ROUTE_EXECUTE } from '../../common/constants';

export async function executeCode(http: any, payload: Record<string, any>) {
  return await http.post(API_ROUTE_EXECUTE, {
    body: JSON.stringify(payload),
  });
}
