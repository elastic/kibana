/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkRequest, RequestBasicOptions } from '../framework';

import { KpiNetworkAdapter } from './types';
import { KpiNetworkData } from '../../graphql/types';

export class KpiNetwork {
  constructor(private readonly adapter: KpiNetworkAdapter) {}

  public async getKpiNetwork(
    req: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<KpiNetworkData> {
    return await this.adapter.getKpiNetwork(req, options);
  }
}
