/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { errorResponseSchema } from '@kbn/alerting-v2-schemas';
import { PluginStart } from '@kbn/core-di';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable, optional } from 'inversify';
import type { AlertingServerStart } from '@kbn/alerting-plugin/server';
import { AlertingAuthorizationEntity } from '@kbn/alerting-plugin/server';
import type { AlertingServerStartDependencies } from '../../types';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_INTERNAL_EPISODES_LIST_API_PATH } from '../constants';
import { QueryServiceScopedToken } from '../../lib/services/query_service/tokens';
import type { QueryServiceContract } from '../../lib/services/query_service/query_service';
import { buildUnifiedEpisodesQuery } from '../../lib/episodes/build_unified_episodes_query';
import {
  hasAuthorizedClassicAlertTypes,
  type AuthorizedRuleTypesLike,
} from '../../lib/episodes/build_v1_authz_where';

const ROUTE_AUTH_PRIVILEGES = [ALERTING_V2_API_PRIVILEGES.alerts.read] as const;

const listUnifiedEpisodesBodySchema = z.object({
  pageSize: z.number().int().min(1).max(1000).default(1000),
  sortField: z.string().optional().default('@timestamp'),
  sortDirection: z.enum(['asc', 'desc']).optional().default('desc'),
  filterState: z
    .object({
      status: z.array(z.string()).nullable().optional(),
      ruleId: z.string().nullable().optional(),
      groupHash: z.string().nullable().optional(),
      queryString: z.string().nullable().optional(),
      tags: z.array(z.string()).nullable().optional(),
      severity: z.array(z.string()).nullable().optional(),
      assigneeUid: z.string().optional(),
    })
    .optional(),
  timeRange: z
    .object({
      from: z.string(),
      to: z.string(),
    })
    .optional(),
});

type ListUnifiedEpisodesBody = z.infer<typeof listUnifiedEpisodesBodySchema>;

@injectable()
export class ListUnifiedEpisodesRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = ALERTING_V2_INTERNAL_EPISODES_LIST_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [...ROUTE_AUTH_PRIVILEGES],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'List unified alert episodes',
    description:
      'Returns v2 alert episodes and classic (v1) alerts in one ES|QL result set, with classic RBAC applied.',
  } as const;
  static schemas = {
    request: {
      body: listUnifiedEpisodesBodySchema,
    },
    response: {
      400: {
        body: () => errorResponseSchema,
        description: 'Indicates an invalid schema or parameters.',
      },
    },
  };

  protected readonly routeName = 'list unified episodes';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, ListUnifiedEpisodesBody>,
    @inject(QueryServiceScopedToken)
    private readonly queryService: QueryServiceContract,
    @inject(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'))
    private readonly spaces: AlertingServerStartDependencies['spaces'],
    @optional()
    @inject(PluginStart<NonNullable<AlertingServerStartDependencies['alerting']>>('alerting'))
    private readonly alertingStart?: AlertingServerStart
  ) {
    super(ctx);
  }

  protected async execute() {
    const { pageSize, sortField, sortDirection, filterState, timeRange } = this.request.body;
    const spaceId = this.spaces.spacesService.getSpaceId(this.request);

    let authorizedRuleTypes: AuthorizedRuleTypesLike | null = null;
    let includeClassicAlerts = false;

    if (this.alertingStart) {
      try {
        const authorization = await this.alertingStart.getAlertingAuthorizationWithRequest(
          this.request
        );
        authorizedRuleTypes = await authorization.getAllAuthorizedRuleTypesFindOperation({
          authorizationEntity: AlertingAuthorizationEntity.Alert,
        });
        includeClassicAlerts = hasAuthorizedClassicAlertTypes(authorizedRuleTypes);
      } catch (error) {
        this.ctx.logger.warn(
          `Failed to resolve classic alert authorization; returning v2 episodes only: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    const query = buildUnifiedEpisodesQuery({
      spaceId,
      pageSize,
      sortState: { sortField, sortDirection },
      filterState,
      authorizedRuleTypes,
      includeClassicAlerts,
    });

    const filter =
      timeRange != null
        ? {
            range: {
              '@timestamp': {
                gte: timeRange.from,
                lte: timeRange.to,
                format: 'strict_date_optional_time',
              },
            },
          }
        : undefined;

    const episodes = await this.queryService.executeQueryRows({
      query,
      filter,
    });

    return this.ctx.response.ok({ body: { episodes } });
  }
}
