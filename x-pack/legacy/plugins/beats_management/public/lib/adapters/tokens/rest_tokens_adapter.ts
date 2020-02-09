/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReturnTypeBulkCreate } from '../../../../common/return_types';
import { RestAPIAdapter } from '../rest_api/adapter_types';
import { CMTokensAdapter } from './adapter_types';

export class RestTokensAdapter implements CMTokensAdapter {
  constructor(private readonly REST: RestAPIAdapter) {}

  public async createEnrollmentTokens(numTokens: number = 1): Promise<string[]> {
    const results = (
      await this.REST.post<ReturnTypeBulkCreate<string>>('/api/beats/enrollment_tokens', {
        num_tokens: numTokens,
      })
    ).results;
    return results.map(result => result.item);
  }
}
