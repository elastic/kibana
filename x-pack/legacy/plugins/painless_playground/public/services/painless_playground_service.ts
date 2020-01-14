/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ROUTES } from '../../common/constants';

export class PainlessPlaygroundService {
  constructor(private http: any) {
    this.http = http;
  }

  async simulate(payload: unknown) {
    try {
      return await this.http.post(`${ROUTES.API_ROOT}/simulate`, {
        body: JSON.stringify(payload),
      });
    } catch (e) {
      return e;
    }
  }
}
