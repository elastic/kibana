/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { Request } from '@kbn/core-di-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import type { RuleDoctorFindingsClient } from '../../lib/rule_doctor_findings_client/rule_doctor_findings_client';
import { FindingsClientScopedToken } from '../../lib/rule_doctor_findings_client/tokens';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_RULE_DOCTOR_FINDINGS_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { SpaceContext } from './space_context';

const updateFindingStatusParamsSchema = z.object({
  finding_id: z.string().describe('The identifier for the finding.'),
});

const updateFindingStatusBodySchema = z.object({
  status: z.enum(['open', 'dismissed', 'applied']).describe('The new status for the finding.'),
});

@injectable()
export class UpdateFindingStatusRoute extends BaseAlertingRoute {
  static method = 'put' as const;
  static path = `${ALERTING_V2_RULE_DOCTOR_FINDINGS_API_PATH}/{finding_id}/status`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.ruleDoctor.write],
    },
  };
  static routeOptions = {
    summary: 'Update a Rule Doctor finding status',
  } as const;
  static validate = {
    request: {
      params: buildRouteValidationWithZod(updateFindingStatusParamsSchema),
      body: buildRouteValidationWithZod(updateFindingStatusBodySchema),
    },
  };

  protected readonly routeName = 'update finding status';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof updateFindingStatusParamsSchema>,
      unknown,
      z.infer<typeof updateFindingStatusBodySchema>
    >,
    @inject(FindingsClientScopedToken)
    private readonly findingsClient: RuleDoctorFindingsClient,
    @inject(SpaceContext) private readonly spaceContext: SpaceContext
  ) {
    super(ctx);
  }

  protected async execute() {
    await this.findingsClient.updateFindingStatus(
      this.request.params.finding_id,
      this.request.body.status,
      this.spaceContext.spaceId
    );
    return this.ctx.response.noContent();
  }
}
