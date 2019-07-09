/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OverviewHostData, OverviewNetworkData } from '../../graphql/types';
import { FrameworkRequest, RequestBasicOptions } from '../framework';

import { OverviewAdapter } from './types';

export class Overview {
  constructor(private readonly adapter: OverviewAdapter) {}

  public async getOverviewNetwork(
    req: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<OverviewNetworkData> {
    return await this.adapter.getOverviewNetwork(req, options);
  }

  public async getOverviewHost(
    req: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<OverviewHostData> {
    return await this.adapter.getOverviewHost(req, options);
  }
}
