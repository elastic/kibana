/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMSavedObjectsAdapter } from './types';

export class UMMemorySavedObjectsAdapter implements UMSavedObjectsAdapter {
  public async getUptimeIndexPattern(): Promise<any> {
    return {};
  }
}
