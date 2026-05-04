/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RouteSecurity } from '@kbn/core/server';
import { Request } from '@kbn/core-di-server';
import { PluginStart } from '@kbn/core-di';
import { z } from '@kbn/zod/v4';
import { injectable, inject } from 'inversify';
import type { IValidatedEvent } from '@kbn/event-log-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { ActionPolicyClient } from '../../lib/action_policy_client/action_policy_client';
import { RulesClient } from '../../lib/rules_client';
import { ACTION_POLICY_SAVED_OBJECT_TYPE, RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ACTION_POLICY_EVENT_ACTIONS } from '../../lib/dispatcher/steps/constants';
import { WorkflowsManagementApiToken } from '../../lib/dispatcher/steps/dispatch_step_tokens';
import { EventLogServiceToken } from '../../lib/services/event_log_service/tokens';
import type { EventLogServiceContract } from '../../lib/services/event_log_service/event_log_service';
import type { AlertingServerStartDependencies } from '../../types';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH } from '../constants';
import { buildRouteValidationWithZod } from '../route_validation';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 100;
const MAX_PER_PAGE = DEFAULT_PER_PAGE;
const TIME_WINDOW_HOURS = 24;

const listExecutionHistoryQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().describe('Page number (1-indexed).'),
  perPage: z.coerce
    .number()
    .min(1)
    .max(MAX_PER_PAGE)
    .optional()
    .describe('Number of events per page.'),
});

const namedRefSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
});

const policyExecutionHistoryItemSchema = z.object({
  '@timestamp': z.string(),
  policy: namedRefSchema,
  rule: namedRefSchema,
  outcome: z.enum([ACTION_POLICY_EVENT_ACTIONS.DISPATCHED, ACTION_POLICY_EVENT_ACTIONS.THROTTLED]),
  episode_count: z.number(),
  action_group_count: z.number(),
  workflows: z.array(namedRefSchema),
});

const listExecutionHistoryResponseSchema = z.object({
  items: z.array(policyExecutionHistoryItemSchema),
  page: z.number(),
  perPage: z.number(),
  total: z.number(),
});

type PolicyExecutionHistoryItem = z.infer<typeof policyExecutionHistoryItemSchema>;

interface NameMaps {
  policyNames: Map<string, string>;
  ruleNames: Map<string, string>;
  workflowNames: Map<string, string>;
}

@injectable()
export class ListExecutionHistoryRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH;
  static security: RouteSecurity = {
    authz: {
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
      query: buildRouteValidationWithZod(listExecutionHistoryQuerySchema),
    },
    response: {
      200: {
        body: () => listExecutionHistoryResponseSchema,
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
      z.infer<typeof listExecutionHistoryQuerySchema>,
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
        total: result.total,
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

type PolicyOutcome =
  | typeof ACTION_POLICY_EVENT_ACTIONS.DISPATCHED
  | typeof ACTION_POLICY_EVENT_ACTIONS.THROTTLED;

const isString = (v: unknown): v is string => typeof v === 'string';

const isPolicyOutcome = (action: unknown): action is PolicyOutcome =>
  action === ACTION_POLICY_EVENT_ACTIONS.DISPATCHED ||
  action === ACTION_POLICY_EVENT_ACTIONS.THROTTLED;

function collectIdsFromEvents(events: IValidatedEvent[]): {
  policyIds: string[];
  ruleIds: string[];
  workflowIds: string[];
} {
  const policyIds = new Set<string>();
  const ruleIds = new Set<string>();
  const workflowIds = new Set<string>();

  for (const event of events) {
    if (!event) continue;
    const savedObjects = event.kibana?.saved_objects ?? [];
    for (const so of savedObjects) {
      if (!isString(so.id)) continue;
      if (so.type === ACTION_POLICY_SAVED_OBJECT_TYPE) policyIds.add(so.id);
      else if (so.type === RULE_SAVED_OBJECT_TYPE) ruleIds.add(so.id);
    }
    const dispatcher = event.kibana?.alerting_v2?.dispatcher;
    for (const id of dispatcher?.rule_ids ?? []) {
      if (isString(id)) ruleIds.add(id);
    }
    for (const id of dispatcher?.workflow_ids ?? []) {
      if (isString(id)) workflowIds.add(id);
    }
  }

  return {
    policyIds: [...policyIds],
    ruleIds: [...ruleIds],
    workflowIds: [...workflowIds],
  };
}

function denormalizeEvent(
  event: IValidatedEvent,
  { policyNames, ruleNames, workflowNames }: NameMaps
): PolicyExecutionHistoryItem[] {
  if (!event) return [];

  const timestamp = event['@timestamp'];
  const action = event.event?.action;
  if (!timestamp || !isPolicyOutcome(action)) return [];

  const savedObjects = event.kibana?.saved_objects ?? [];
  const policyId = savedObjects.find((so) => so.type === ACTION_POLICY_SAVED_OBJECT_TYPE)?.id;
  if (!policyId) return [];

  const dispatcher = event.kibana?.alerting_v2?.dispatcher ?? {};

  const referencedRuleIds = savedObjects
    .filter((so) => so.type === RULE_SAVED_OBJECT_TYPE)
    .map((so) => so.id);
  const spilloverRuleIds = dispatcher.rule_ids ?? [];

  const allRuleIds = [...referencedRuleIds, ...spilloverRuleIds].filter(isString);

  const workflows = (dispatcher.workflow_ids ?? [])
    .filter(isString)
    .map((id) => ({ id, name: workflowNames.get(id) ?? null }));

  return allRuleIds.map((ruleId) => ({
    '@timestamp': timestamp,
    policy: { id: policyId, name: policyNames.get(policyId) ?? null },
    rule: { id: ruleId, name: ruleNames.get(ruleId) ?? null },
    outcome: action,
    episode_count: Number(dispatcher.episode_count ?? 0),
    action_group_count: Number(dispatcher.action_group_count ?? 0),
    workflows,
  }));
}
