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
import { RULE_DOCTOR_FINDINGS_INDEX } from '../../resources/indices/rule_doctor_findings';

const paramsSchema = z.object({
  findingId: z.string(),
});

const bodySchema = z.object({
  status: z.enum(['applied', 'dismissed']),
});

const responseSchema = z.object({
  success: z.boolean(),
});

type RequestParams = z.infer<typeof paramsSchema>;
type RequestBody = z.infer<typeof bodySchema>;

@injectable()
export class UpdateRuleDoctorFindingStatusRoute extends BaseAlertingRoute {
  static method = 'put' as const;
  static path = '/internal/alerting/v2/rule_doctor/findings/{findingId}/status';
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.write],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Update Rule Doctor finding status',
  };
  static validate = {
    request: {
      params: buildRouteValidationWithZod(paramsSchema),
      body: buildRouteValidationWithZod(bodySchema),
    },
    response: {
      200: {
        body: () => responseSchema,
        description: 'Finding status updated.',
      },
    },
  };

  protected readonly routeName = 'update rule doctor finding status';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<RequestParams, unknown, RequestBody>,
    @inject(EsServiceInternalToken)
    private readonly esClient: ElasticsearchClient,
    @inject(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'))
    private readonly spaces: SpacesPluginStart
  ) {
    super(ctx);
  }

  protected async execute() {
    const { findingId } = this.request.params;
    const { status } = this.request.body;
    const spaceId = this.spaces.spacesService.getSpaceId(this.request);

    const existing = await this.esClient.get<{ space_id?: string }>({
      index: RULE_DOCTOR_FINDINGS_INDEX,
      id: findingId,
      _source_includes: ['space_id'],
    });

    if (existing._source?.space_id !== spaceId) {
      throw Boom.notFound(`Finding ${findingId} not found`);
    }

    await this.esClient.update({
      index: RULE_DOCTOR_FINDINGS_INDEX,
      id: findingId,
      doc: { status },
      refresh: 'wait_for',
    });

    return this.ctx.response.ok({
      body: { success: true },
    });
  }
}
