/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { StreamsConfig } from '../../../../../common/config';
import { StreamsPluginStartDependencies } from '../../../../types';
import { AssetClient } from '../asset_client';
import { QueryClient } from './query_client';
import { createFakeRequestBoundToDefaultSpace } from '../../helpers/fake_request_factory';

export class QueryService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly logger: Logger,
    private readonly config: StreamsConfig
  ) {}

  async getClientWithRequest({
    request,
    assetClient,
  }: {
    request: KibanaRequest;
    assetClient: AssetClient;
  }): Promise<QueryClient> {
    const [_, pluginStart] = await this.coreSetup.getStartServices();

    const fakeRequest = createFakeRequestBoundToDefaultSpace(request);
    const rulesClient = await pluginStart.alerting.getRulesClientWithRequest(fakeRequest);

    return new QueryClient({
      assetClient,
      rulesClient,
      config: this.config,
      logger: this.logger,
    });
  }
}
