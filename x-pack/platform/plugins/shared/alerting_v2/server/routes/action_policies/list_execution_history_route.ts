/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RouteSecurity } from '@kbn/core/server';
import { Request } from '@kbn/core-di-server';
import { PluginStart } from '@kbn/core-di';
import type { z } from '@kbn/zod/v4';
import { injectable, inject } from 'inversify';
import type { IValidatedEvent } from '@kbn/event-log-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import {
  listPolicyExecutionHistoryQuerySchema,
  listPolicyExecutionHistoryResponseSchema,
  POLICY_EXECUTION_HISTORY_MAX_PER_PAGE,
} from '@kbn/alerting-v2-schemas';
import { ActionPolicyClient } from '../../lib/action_policy_client/action_policy_client';
import { RulesClient } from '../../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { WorkflowsManagementApiToken } from '../../lib/dispatcher/steps/dispatch_step_tokens';
import { EventLogServiceToken } from '../../lib/services/event_log_service/tokens';
import type { EventLogServiceContract } from '../../lib/services/event_log_service/event_log_service';
import type { AlertingServerStartDependencies } from '../../types';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH } from '../constants';
import { buildRouteValidationWithZod } from '../route_validation';
import { collectIdsFromEvents, denormalizeEvent, type NameMaps } from './utils/denormalize_event';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = POLICY_EXECUTION_HISTORY_MAX_PER_PAGE;
const TIME_WINDOW_HOURS = 24;

@injectable()
export class ListExecutionHistoryRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH;
  static security: RouteSecurity = {
    authz: {
      // TODO(rna-program#461): swap for the dedicated execution-history feature
      // privilege once it lands. Until then we gate by actionPolicies.read.
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.actionPolicies.read],
    },
  };
  static routeOptions = {
    summary: 'List action policy execution history',
    description:
      'Get a paginated list of dispatcher summary events for action policies in the current space.',
  } as const;
  static validate = {
    request: {
      query: buildRouteValidationWithZod(listPolicyExecutionHistoryQuerySchema),
    },
    response: {
      200: {
        body: () => listPolicyExecutionHistoryResponseSchema,
        description: 'Indicates a successful call.',
      },
    },
  };

  protected readonly routeName = 'list action policy execution history';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      unknown,
      z.infer<typeof listPolicyExecutionHistoryQuerySchema>,
      unknown
    >,
    @inject(EventLogServiceToken) private readonly eventLogService: EventLogServiceContract,
    @inject(ActionPolicyClient) private readonly actionPolicyClient: ActionPolicyClient,
    @inject(RulesClient) private readonly rulesClient: RulesClient,
    @inject(WorkflowsManagementApiToken)
    private readonly workflowsManagement: WorkflowsServerPluginSetup['management'],
    @inject(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'))
    private readonly spaces: AlertingServerStartDependencies['spaces']
  ) {
    super(ctx);
  }

  protected async execute() {
    const { page = DEFAULT_PAGE, perPage = DEFAULT_PER_PAGE } = this.request.query ?? {};
    const startDate = new Date(Date.now() - TIME_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

    const result = await this.eventLogService.findActionPolicyExecutionEvents({
      request: this.request,
      startDate,
      page,
      perPage,
    });

    const nameMaps = await this.resolveNames(result.events);
    const items = result.events.flatMap((event) => denormalizeEvent(event, nameMaps));

    return this.ctx.response.ok({
      body: {
        items,
        page: result.page,
        perPage: result.perPage,
        totalEvents: result.total,
      },
    });
  }

  private async resolveNames(events: IValidatedEvent[]): Promise<NameMaps> {
    const { policyIds, ruleIds, workflowIds } = collectIdsFromEvents(events);
    const spaceId = this.spaces.spacesService.getSpaceId(this.request);

    const [policies, rules, workflows] = await Promise.all([
      this.actionPolicyClient.getActionPolicies({ ids: policyIds }),
      this.rulesClient.getRules(ruleIds),
      this.workflowsManagement.getWorkflowsByIds(workflowIds, spaceId),
    ]);

    return {
      policyNames: new Map(policies.map((p) => [p.id, p.name])),
      ruleNames: new Map(rules.map((r) => [r.id, r.metadata.name])),
      workflowNames: new Map(workflows.map((w) => [w.id, w.name])),
    };
  }
}
