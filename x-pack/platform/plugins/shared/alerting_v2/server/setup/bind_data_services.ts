/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, Request } from '@kbn/core-di-server';
import type { ContainerModuleLoadOptions } from 'inversify';
import {
  EsServiceInternalToken,
  EsServiceScopedToken,
  EsServiceScopedSpaceRoutingToken,
} from '../lib/services/es_service/tokens';
import { EsqlResponseFormatService } from '../lib/services/esql_response_format_service/esql_response_format_service';
import { EsqlResponseFormatServiceToken } from '../lib/services/esql_response_format_service/tokens';
import { QueryService } from '../lib/services/query_service/query_service';
import {
  QueryServiceInternalToken,
  QueryServiceScopedToken,
  QueryServiceScopedSpaceRoutingToken,
} from '../lib/services/query_service/tokens';
import { StorageService } from '../lib/services/storage_service/storage_service';
import {
  StorageServiceInternalToken,
  StorageServiceScopedToken,
} from '../lib/services/storage_service/tokens';

/**
 * Elasticsearch client flavors and the Query/Storage/ESQL services layered on top
 * of them, split by execution scope (internal, request-scoped, space-routed).
 */
export function bindDataServices({ bind }: ContainerModuleLoadOptions) {
  bind(EsServiceInternalToken).toResolvedValue(
    (elasticsearch) => elasticsearch.client.asInternalUser,
    [CoreStart('elasticsearch')]
  );

  bind(EsServiceScopedToken)
    .toResolvedValue(
      (request, elasticsearch) => elasticsearch.client.asScoped(request).asCurrentUser,
      [Request, CoreStart('elasticsearch')]
    )
    .inRequestScope();

  bind(EsServiceScopedSpaceRoutingToken)
    .toResolvedValue(
      (request, elasticsearch) =>
        // `projectRouting: 'space'` scopes rule-execution queries to the originating space/project
        // when CPS is enabled, matching alerting v1 behavior. Only `asCurrentUser` honors the option.
        elasticsearch.client.asScoped(request, { projectRouting: 'space' }).asCurrentUser,
      [Request, CoreStart('elasticsearch')]
    )
    .inRequestScope();

  // Singleton so the feature flag is subscribed to once per process, and every
  // QueryService flavor plus the rule-executor step read the same resolved format.
  bind(EsqlResponseFormatService).toSelf();
  bind(EsqlResponseFormatServiceToken).toService(EsqlResponseFormatService);

  bind(QueryServiceScopedToken)
    .toResolvedValue(
      (esClient, format) => new QueryService(esClient, format),
      [EsServiceScopedToken, EsqlResponseFormatServiceToken]
    )
    .inRequestScope();

  // Rule-execution queries run against user data and must respect the space project routing.
  bind(QueryServiceScopedSpaceRoutingToken)
    .toResolvedValue(
      (esClient, format) => new QueryService(esClient, format),
      [EsServiceScopedSpaceRoutingToken, EsqlResponseFormatServiceToken]
    )
    .inRequestScope();

  bind(QueryServiceInternalToken).toResolvedValue(
    (esClient, format) => new QueryService(esClient, format),
    [EsServiceInternalToken, EsqlResponseFormatServiceToken]
  );

  bind(StorageServiceScopedToken)
    .toResolvedValue((esClient) => new StorageService(esClient), [EsServiceScopedToken])
    .inRequestScope();

  bind(StorageServiceInternalToken).toResolvedValue(
    (esClient) => new StorageService(esClient),
    [EsServiceInternalToken]
  );
}
