/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IngestPolicyLib,
  IngestOutputLib,
  PoliciesRepository as PoliciesRepositoryType,
} from './types';
import { FrameworkUser } from '../../adapters/framework/adapter_types';

export class PoliciesRepository implements PoliciesRepositoryType {
  constructor(
    private readonly ingestPolicyLib?: IngestPolicyLib,
    private readonly ingestOutputLib?: IngestOutputLib
  ) {}

  /**
   * Return a full policy
   *
   * @param id
   */
  async getPolicyOutputByIDs(user: FrameworkUser, ids: string[]) {
    if (this.ingestOutputLib) {
      return await this.ingestOutputLib.getByIDs(
        {
          kind: 'internal',
        },
        ids
      );
    }

    return [];
  }

  async get(user: FrameworkUser, id: string) {
    if (this.ingestPolicyLib) {
      return await this.ingestPolicyLib.get(
        {
          kind: 'internal',
        },
        id
      );
    }

    return null;
  }
}
