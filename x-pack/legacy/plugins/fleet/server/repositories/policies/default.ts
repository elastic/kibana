/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PoliciesRepository as PoliciesRepositoryType } from './types';
import { FrameworkUser } from '../../adapters/framework/adapter_types';

export class PoliciesRepository implements PoliciesRepositoryType {
  constructor(private readonly ingestPolicyLib?: any, private readonly ingestOutputLib?: any) {}

  async getPolicyOutputByIDs(soClient: FrameworkUser) {
    if (this.ingestOutputLib) {
      return [await this.ingestOutputLib.get(soClient, 'default')];
    }

    return [];
  }

  async get(soClient: any, id: string) {
    if (this.ingestPolicyLib) {
      return await this.ingestPolicyLib.get(soClient, id);
    }

    return null;
  }
}
