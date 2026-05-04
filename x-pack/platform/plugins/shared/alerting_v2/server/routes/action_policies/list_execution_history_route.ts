/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RouteSecurity } from '@kbn/core/server';
import { Request } from '@kbn/core-di-server';
import { z } from '@kbn/zod/v4';
import { injectable, inject } from 'inversify';
import type { IValidatedEvent } from '@kbn/event-log-plugin/server';
import { ACTION_POLICY_SAVED_OBJECT_TYPE, RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ACTION_POLICY_EVENT_ACTIONS } from '../../lib/dispatcher/steps/constants';
import { EventLogServiceToken } from '../../lib/services/event_log_service/tokens';
import type { EventLogServiceContract } from '../../lib/services/event_log_service/event_log_service';
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

const policyExecutionHistoryItemSchema = z.object({
  '@timestamp': z.string(),
  policy: z.object({ id: z.string() }),
  rule: z.object({ id: z.string() }),
  outcome: z.enum([ACTION_POLICY_EVENT_ACTIONS.DISPATCHED, ACTION_POLICY_EVENT_ACTIONS.THROTTLED]),
  episode_count: z.number(),
  action_group_count: z.number(),
  workflow_ids: z.array(z.string()),
});

const listExecutionHistoryResponseSchema = z.object({
  items: z.array(policyExecutionHistoryItemSchema),
  page: z.number(),
  perPage: z.number(),
  total: z.number(),
});

type PolicyExecutionHistoryItem = z.infer<typeof policyExecutionHistoryItemSchema>;

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
    access: 'internal',
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
    @inject(EventLogServiceToken) private readonly eventLogService: EventLogServiceContract
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

    const items = result.events.flatMap(denormalizeEvent);

    return this.ctx.response.ok({
      body: {
        items,
        page: result.page,
        perPage: result.perPage,
        total: result.total,
      },
    });
  }
}

function denormalizeEvent(event: IValidatedEvent): PolicyExecutionHistoryItem[] {
  if (!event) return [];

  const action:
    | typeof ACTION_POLICY_EVENT_ACTIONS.DISPATCHED
    | typeof ACTION_POLICY_EVENT_ACTIONS.THROTTLED
    | undefined =
    event.event?.action === ACTION_POLICY_EVENT_ACTIONS.DISPATCHED
      ? ACTION_POLICY_EVENT_ACTIONS.DISPATCHED
      : event.event?.action === ACTION_POLICY_EVENT_ACTIONS.THROTTLED
      ? ACTION_POLICY_EVENT_ACTIONS.THROTTLED
      : undefined;
  if (!action) return [];

  const timestamp = event['@timestamp'];
  if (!timestamp) return [];

  const savedObjects = event.kibana?.saved_objects ?? [];
  const policyId = savedObjects.find((so) => so.type === ACTION_POLICY_SAVED_OBJECT_TYPE)?.id;
  if (!policyId) return [];

  const dispatcher = event.kibana?.alerting_v2?.dispatcher ?? {};
  const ruleIdsFromRefs = savedObjects
    .filter((so) => so.type === RULE_SAVED_OBJECT_TYPE)
    .map((so) => so.id)
    .filter((id): id is string => typeof id === 'string');
  const ruleIdsSpillover = (dispatcher.rule_ids ?? []).filter(
    (id): id is string => typeof id === 'string'
  );
  const allRuleIds = [...ruleIdsFromRefs, ...ruleIdsSpillover];

  const workflowIds = (dispatcher.workflow_ids ?? []).filter(
    (id): id is string => typeof id === 'string'
  );

  return allRuleIds.map((ruleId) => ({
    '@timestamp': timestamp,
    policy: { id: policyId },
    rule: { id: ruleId },
    outcome: action,
    episode_count: Number(dispatcher.episode_count ?? 0),
    action_group_count: Number(dispatcher.action_group_count ?? 0),
    workflow_ids: workflowIds,
  }));
}
