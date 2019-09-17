/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMSavedObjectsAdapter } from '../adapters/saved_objects/types';

export class UMSavedObjectsDomain {
  constructor(private readonly adapter: UMSavedObjectsAdapter, libs: {}) {
    this.adapter = adapter;
  }

  public async getUptimeIndexPattern(request: any) {
    return await this.adapter.getUptimeIndexPattern();
  }
}
