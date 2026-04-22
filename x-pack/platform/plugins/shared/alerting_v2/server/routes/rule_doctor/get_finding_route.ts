/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
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

const paramsSchema = z.object({
  findingId: z.string(),
});

const responseSchema = z.object({
  finding: ruleDoctorFindingDocSchema,
});

type RequestParams = z.infer<typeof paramsSchema>;

@injectable()
export class GetRuleDoctorFindingRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = '/internal/alerting/v2/rule_doctor/findings/{findingId}';
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Get a single Rule Doctor finding',
  };
  static validate = {
    request: {
      params: buildRouteValidationWithZod(paramsSchema),
    },
    response: {
      200: {
        body: () => responseSchema,
        description: 'A single Rule Doctor finding.',
      },
    },
  };

  protected readonly routeName = 'get rule doctor finding';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<RequestParams>,
    @inject(EsServiceInternalToken)
    private readonly esClient: ElasticsearchClient,
    @inject(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'))
    private readonly spaces: SpacesPluginStart
  ) {
    super(ctx);
  }

  protected async execute() {
    const { findingId } = this.request.params;
    const spaceId = this.spaces.spacesService.getSpaceId(this.request);

    const response = await this.esClient.get<Record<string, unknown>>({
      index: RULE_DOCTOR_FINDINGS_INDEX,
      id: findingId,
    }).catch(() => null);

    if (!response?._source || response._source.space_id !== spaceId) {
      throw Boom.notFound(`Finding ${findingId} not found`);
    }

    const source = response._source;
    const finding = {
      ...source,
      finding_id: source.finding_id ?? response._id,
    };

    return this.ctx.response.ok({
      body: { finding },
    });
  }
}
