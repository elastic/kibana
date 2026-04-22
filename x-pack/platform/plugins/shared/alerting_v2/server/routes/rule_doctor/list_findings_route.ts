/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { inject, injectable } from 'inversify';
import { PluginStart } from '@kbn/core-di';
import { Request } from '@kbn/core-di-server';
import { z } from '@kbn/zod/v4';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { buildRouteValidationWithZod } from '../route_validation';
import { EsServiceInternalToken } from '../../lib/services/es_service/tokens';
import type { AlertingServerStartDependencies } from '../../types';
import {
  RULE_DOCTOR_FINDINGS_INDEX,
  ruleDoctorFindingDocSchema,
} from '../../resources/indices/rule_doctor_findings';

const querySchema = z.object({
  status: z.enum(['open', 'applied', 'dismissed']).optional().default('open'),
});

const responseSchema = z.object({
  findings: z.array(ruleDoctorFindingDocSchema),
});

@injectable()
export class ListRuleDoctorFindingsRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = '/internal/alerting/v2/rule_doctor/findings';
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'List Rule Doctor findings',
  };
  static validate = {
    request: {
      query: buildRouteValidationWithZod(querySchema),
    },
    response: {
      200: {
        body: () => responseSchema,
        description: 'Rule Doctor findings filtered by status.',
      },
    },
  };

  protected readonly routeName = 'list rule doctor findings';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, z.infer<typeof querySchema>>,
    @inject(EsServiceInternalToken)
    private readonly esClient: ElasticsearchClient,
    @inject(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'))
    private readonly spaces: SpacesPluginStart
  ) {
    super(ctx);
  }

  protected async execute() {
    const { status } = this.request.query;
    const spaceId = this.spaces.spacesService.getSpaceId(this.request);

    const response = await this.esClient.search({
      index: RULE_DOCTOR_FINDINGS_INDEX,
      size: 100,
      sort: [
        {
          _script: {
            type: 'number',
            order: 'desc',
            script: {
              lang: 'painless',
              source:
                "doc['impact'].size()==0 ? 0 : params.order.getOrDefault(doc['impact'].value, 0)",
              params: { order: { high: 3, medium: 2, low: 1 } },
            },
          },
        },
        { '@timestamp': { order: 'desc' } },
      ],
      query: {
        bool: {
          filter: [{ term: { status } }, { term: { space_id: spaceId } }],
        },
      },
      ignore_unavailable: true,
    });

    const findings = (response.hits.hits ?? []).map((hit) => {
      const source = hit._source as Record<string, unknown>;
      return {
        ...source,
        finding_id: source.finding_id ?? hit._id,
      };
    });

    return this.ctx.response.ok({
      body: { findings },
    });
  }
}
