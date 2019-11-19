/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IngestPlugin, PoliciesRepository as PoliciesRepositoryType } from './types';
import { FrameworkUser } from '../../adapters/framework/adapter_types';

export class PoliciesRepository implements PoliciesRepositoryType {
  constructor(private readonly plugin?: IngestPlugin) {}

  /**
   * Return a full policy
   *
   * @param id
   */
  async getPolicyOutputByIDs(user: FrameworkUser, ids: string[]) {
    if (this.plugin) {
      return await this.plugin.getPolicyOutputByIDs(user, ids);
    }

    return [];
  }

  async get(user: FrameworkUser, id: string) {
    if (this.plugin) {
      return await this.plugin.getPolicyById(user, id);
    }

    return null;
  }
}
