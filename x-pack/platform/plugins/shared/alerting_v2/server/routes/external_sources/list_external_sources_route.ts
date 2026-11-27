/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  errorResponseSchema,
  findExternalSourcesRequestSchema,
  findExternalSourcesResponseSchema,
  type FindExternalSourcesRequest,
} from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import type { z } from '@kbn/zod/v4';
import { inject, injectable } from 'inversify';
import { ExternalSourceClient } from '../../lib/external_source_client';
import type { FindExternalSourcesParams } from '../../lib/external_source_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { AlertingRouteContext } from '../alerting_route_context';
import { BaseAlertingRoute } from '../base_alerting_route';
import { ALERTING_V2_INTERNAL_EXTERNAL_SOURCE_API_PATH } from '../constants';
import { assertAllFieldsMapped, type Complete } from '../mapper_types';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';

export const toFindExternalSourcesParams = ({
  page,
  per_page: perPage,
  search,
  sort_field: sortField,
  sort_order: sortOrder,
  connector_id: connectorId,
  type,
  ...rest
}: FindExternalSourcesRequest): Complete<FindExternalSourcesParams> => {
  assertAllFieldsMapped(rest);
  return { page, perPage, search, sortField, sortOrder, connectorId, type };
};

@injectable()
export class ListExternalSourcesRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = ALERTING_V2_INTERNAL_EXTERNAL_SOURCE_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.alerts.read],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'List imports',
    description: 'Get a paginated list of imports with optional search and sorting.',
  } as const;
  static schemas = {
    request: {
      query: findExternalSourcesRequestSchema,
    },
    response: {
      200: {
        body: () => findExternalSourcesResponseSchema,
        description: 'Returns a paginated list of imports.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'list external sources';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      unknown,
      z.infer<typeof findExternalSourcesRequestSchema>,
      unknown
    >,
    @inject(ExternalSourceClient) private readonly externalSourceClient: ExternalSourceClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.externalSourceClient.findExternalSources(
      toFindExternalSourcesParams(this.request.query ?? {})
    );
    return this.ctx.response.ok({ body: result });
  }
}
