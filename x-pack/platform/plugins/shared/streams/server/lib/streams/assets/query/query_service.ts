/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import { StreamsPluginStartDependencies } from '../../../../types';
import { createFakeRequestBoundToDefaultSpace } from '../../helpers/fake_request_factory';
import { AssetClient } from '../asset_client';
import { QueryClient } from './query_client';

export class QueryService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly logger: Logger
  ) {}

  async getClientWithRequest({
    request,
    assetClient,
  }: {
    request: KibanaRequest;
    assetClient: AssetClient;
  }): Promise<QueryClient> {
    const [core, pluginStart] = await this.coreSetup.getStartServices();

    const soClient = core.savedObjects.getScopedClient(request);
    const uiSettings = core.uiSettings.asScopedToClient(soClient);
    const isSignificantEventsEnabled =
      (await uiSettings.get(OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS)) ?? false;

    const fakeRequest = createFakeRequestBoundToDefaultSpace(request);
    const rulesClient = await pluginStart.alerting.getRulesClientWithRequest(fakeRequest);

    return new QueryClient(
      {
        assetClient,
        rulesClient,
        logger: this.logger,
      },
      isSignificantEventsEnabled
    );
  }
}
