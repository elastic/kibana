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

const listFindingsQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1).describe('The page number to return.'),
  perPage: z.coerce
    .number()
    .min(1)
    .max(1000)
    .optional()
    .default(20)
    .describe('The number of findings to return per page.'),
  status: z
    .enum(['open', 'dismissed', 'applied'])
    .optional()
    .describe('Filter findings by status.'),
  type: z.string().optional().describe('Filter findings by type.'),
  execution_id: z.string().optional().describe('Filter findings by execution ID.'),
  rule_ids: z
    .string()
    .optional()
    .describe('Comma-separated list of rule IDs to filter by.'),
});

@injectable()
export class ListFindingsRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = ALERTING_V2_RULE_DOCTOR_FINDINGS_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.ruleDoctor.read],
    },
  };
  static routeOptions = {
    summary: 'List Rule Doctor findings',
  } as const;
  static validate = {
    request: {
      query: buildRouteValidationWithZod(listFindingsQuerySchema),
    },
  };

  protected readonly routeName = 'list findings';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      unknown,
      z.infer<typeof listFindingsQuerySchema>,
      unknown
    >,
    @inject(FindingsClientScopedToken)
    private readonly findingsClient: RuleDoctorFindingsClient,
    @inject(SpaceContext) private readonly spaceContext: SpaceContext
  ) {
    super(ctx);
  }

  protected async execute() {
    const { page, perPage, status, type, execution_id: executionId, rule_ids } = this.request.query;
    const from = (page - 1) * perPage;
    const ruleIds = rule_ids ? rule_ids.split(',').map((id) => id.trim()) : undefined;

    const result = await this.findingsClient.listFindings({
      spaceId: this.spaceContext.spaceId,
      from,
      size: perPage,
      status,
      type,
      executionId,
      ruleIds,
    });

    return this.ctx.response.ok({
      body: { items: result.items, total: result.total, page, perPage },
    });
  }
}
