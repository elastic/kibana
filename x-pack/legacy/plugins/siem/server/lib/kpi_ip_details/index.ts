/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KpiIpDetailsData } from '../../graphql/types';
import { FrameworkRequest } from '../framework';

import { KpiIpDetailsAdapter } from './types';
import { IpOverviewRequestOptions } from '../ip_details';

export class KpiIpDetails {
  constructor(private readonly adapter: KpiIpDetailsAdapter) {}

  public async getKpiIpDetails(
    req: FrameworkRequest,
    options: IpOverviewRequestOptions
  ): Promise<KpiIpDetailsData> {
    return await this.adapter.getKpiIpDetails(req, options);
  }
}
