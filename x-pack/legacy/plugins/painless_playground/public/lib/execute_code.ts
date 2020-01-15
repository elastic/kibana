/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ROUTES } from '../../common/constants';

export async function executeCode(http: any, payload: Record<string, any>) {
  try {
    return await http.post(`${ROUTES.API_ROOT}/simulate`, {
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return e;
  }
}
