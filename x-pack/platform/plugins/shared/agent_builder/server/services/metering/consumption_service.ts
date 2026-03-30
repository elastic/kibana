/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, ElasticsearchServiceStart } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { FieldValue } from '@elastic/elasticsearch/lib/api/types';
import type {
  ConsumptionResponse,
  ConsumptionSortField,
} from '../../../common/http_api/consumption';
import { getCurrentSpaceId } from '../../utils/spaces';
import {
  buildConsumptionQuery,
  buildConsumptionDataSearchParams,
  buildConsumptionAggsSearchParams,
  buildConsumptionResponseBody,
} from './utils';

/**
 * Shape of the validated consumption request body.
 * Used internally to cast and read the request payload.
 */
export interface ConsumptionRequestPayload {
  size: number;
  sort_field: ConsumptionSortField;
  sort_order: 'asc' | 'desc';
  search_after?: FieldValue[];
  search?: string;
  usernames?: string[];
  has_warnings?: boolean;
}

/**
 * Scoped client pre-bound to a specific request.
 * Reads params/body from the captured request so callers
 * don't need to pass anything.
 */
export interface ConsumptionClient {
  getConsumption(): Promise<ConsumptionResponse>;
}

/**
 * Started consumption service that can create request-scoped clients.
 */
export interface ConsumptionServiceStart {
  getScopedClient(options: { request: KibanaRequest }): ConsumptionClient;
}

/**
 * Lifecycle service following the same setup/start pattern as
 * PluginsService and other agent_builder services. Created at setup
 * time, receives elasticsearch + spaces at start time.
 */
export interface ConsumptionService {
  setup(): void;
  start(deps: ConsumptionServiceStartDeps): ConsumptionServiceStart;
}

export interface ConsumptionServiceStartDeps {
  elasticsearch: ElasticsearchServiceStart;
  spaces?: SpacesPluginStart;
}

export const createConsumptionService = (): ConsumptionService => {
  return new ConsumptionServiceImpl();
};

class ConsumptionServiceImpl implements ConsumptionService {
  private startDeps?: ConsumptionServiceStartDeps;

  setup(): void {}

  start(deps: ConsumptionServiceStartDeps): ConsumptionServiceStart {
    this.startDeps = deps;

    return {
      getScopedClient: (options) => this.getScopedClient(options),
    };
  }

  private getStartDeps(): ConsumptionServiceStartDeps {
    if (!this.startDeps) {
      throw new Error('ConsumptionService#start has not been called');
    }
    return this.startDeps;
  }

  private getScopedClient({ request }: { request: KibanaRequest }): ConsumptionClient {
    const { elasticsearch, spaces } = this.getStartDeps();
    const esClient = elasticsearch.client.asScoped(request).asInternalUser;
    const space = getCurrentSpaceId({ request, spaces });
    const { agent_id: agentId } = request.params as { agent_id: string };
    const {
      size,
      sort_field: sortField,
      sort_order: sortOrder,
      search_after: searchAfter,
      search: searchText,
      usernames: usernameFilter,
      has_warnings: hasWarningsFilter,
    } = request.body as ConsumptionRequestPayload;

    return {
      async getConsumption(): Promise<ConsumptionResponse> {
        const { query, runtimeMappings } = buildConsumptionQuery({
          space,
          agentId,
          usernameFilter,
          searchText,
          hasWarningsFilter,
        });

        const [esResponse, aggsResponse] = await Promise.all([
          esClient.search(
            buildConsumptionDataSearchParams({
              query,
              runtimeMappings,
              size,
              sortField,
              sortOrder,
              searchAfter,
            })
          ),
          esClient.search(buildConsumptionAggsSearchParams(space, agentId)),
        ]);

        return buildConsumptionResponseBody(esResponse, aggsResponse);
      },
    };
  }
}
