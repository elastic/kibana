/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { AlertingServerStart } from '@kbn/alerting-plugin/server';
import type {
  AlertTriggerSubscription,
  Conversation,
  ConversationWithoutRounds,
  TriggerContext,
  TriggerSubscription,
  StandingSessionStatus,
  SessionListOptions,
  PendingTriggerEvent,
  ScheduleTriggerSubscription,
  ReminderTriggerSubscription,
  WebhookTriggerSubscription,
  StandingSessionState,
} from '@kbn/agent-builder-common';
import { AgentExecutionMode, ExecutionStatus } from '@kbn/agent-builder-common';
import type { AgentExecutionService } from '@kbn/agent-builder-server/execution';
import type {
  SessionClient,
  CreateSessionParams,
  EnqueueTriggerResult,
} from '@kbn/agent-builder-server';
import {
  scheduleSessionScheduledTask,
  scheduleSessionReminderTask,
  cancelSessionTriggerTask,
  scheduledTaskId,
  reminderTaskId,
} from './trigger_tasks';
import { AGENT_SESSION_ALERT_CONNECTOR_TYPE_ID } from './alert_handler';
import type { ConversationService } from '../conversation';
import type { ConversationProperties } from '../conversation/client/storage';
import { conversationIndexName } from '../conversation/client/storage';

const MAX_RETRIES = 3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatTriggerMessage = (context: TriggerContext): string => {
  switch (context.type) {
    case 'alert_trigger':
      return `Alert rule "${
        context.event.rule_name
      }" fired. Alert IDs: [${context.event.alert_ids.join(', ')}].`;
    case 'schedule_trigger':
      return `Scheduled trigger fired (${context.event.schedule_description}) at ${context.event.fired_at}.`;
    case 'reminder_trigger':
      return `Reminder fired at ${context.event.fired_at}${
        context.event.note ? `: ${context.event.note}` : ''
      }.`;
    case 'webhook_trigger':
      return `Webhook trigger received at ${context.event.received_at}. Payload: ${JSON.stringify(
        context.event.payload
      )}`;
    case 'session_message':
      return context.event.message;
  }
};

const getStandingSession = (source: ConversationProperties): StandingSessionState => {
  const standing = source.state?.standing_session;
  if (!standing) {
    throw new Error('Document is not a standing session (missing state.standing_session)');
  }
  return standing;
};

const updateStandingSession = (
  source: ConversationProperties,
  updated: StandingSessionState
): ConversationProperties => ({
  ...source,
  state: { ...source.state, standing_session: updated },
});

// ---------------------------------------------------------------------------
// Deps
// ---------------------------------------------------------------------------

export interface SessionClientImplDeps {
  esClient: ElasticsearchClient;
  taskManager: TaskManagerStartContract;
  logger: Logger;
  request: KibanaRequest;
  space: string;
  security: SecurityServiceStart;
  conversationService: ConversationService;
  getExecutionService: () => AgentExecutionService;
  getActionsStart: () => ActionsPluginStart;
  getAlertingStart: (() => AlertingServerStart) | undefined;
}

// ---------------------------------------------------------------------------
// Session client implementation
// ---------------------------------------------------------------------------

export class SessionClientImpl implements SessionClient {
  private readonly esClient: ElasticsearchClient;
  private readonly taskManager: TaskManagerStartContract;
  private readonly logger: Logger;
  private readonly request: KibanaRequest;
  private readonly space: string;
  private readonly security: SecurityServiceStart;
  private readonly conversationService: ConversationService;
  private readonly getExecutionService: () => AgentExecutionService;
  private readonly getActionsStart: () => ActionsPluginStart;
  private readonly getAlertingStart: (() => AlertingServerStart) | undefined;

  constructor(deps: SessionClientImplDeps) {
    this.esClient = deps.esClient;
    this.taskManager = deps.taskManager;
    this.logger = deps.logger;
    this.request = deps.request;
    this.space = deps.space;
    this.security = deps.security;
    this.conversationService = deps.conversationService;
    this.getExecutionService = deps.getExecutionService;
    this.getActionsStart = deps.getActionsStart;
    this.getAlertingStart = deps.getAlertingStart;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async create(params: CreateSessionParams): Promise<Conversation> {
    const { security, request } = this;
    const conversationClient = await this.conversationService.getScopedClient({ request });

    const authUser = security.authc.getCurrentUser(request);
    const user = authUser
      ? { id: authUser.profile_uid, username: authUser.username }
      : { username: 'system' };

    const now = new Date().toISOString();
    return conversationClient.create({
      agent_id: params.agent_id,
      session_mode: 'standing',
      title: params.name,
      rounds: [],
      state: {
        standing_session: {
          status: 'idle',
          trigger_subscriptions: [],
          pending_triggers: [],
          last_active_at: now,
          created_by: user,
          ...(params.ttl_seconds !== undefined && { ttl_seconds: params.ttl_seconds }),
          ...(params.connector_id !== undefined && { connector_id: params.connector_id }),
          ...(params.system_prompt_override !== undefined && {
            system_prompt_override: params.system_prompt_override,
          }),
        },
      },
    });
  }

  async get(conversationId: string): Promise<Conversation> {
    const conversationClient = await this.conversationService.getScopedClient({
      request: this.request,
    });
    return conversationClient.get(conversationId);
  }

  async list(options?: SessionListOptions): Promise<ConversationWithoutRounds[]> {
    const conversationClient = await this.conversationService.getScopedClient({
      request: this.request,
    });
    return conversationClient.list({ agentId: options?.agent_id, sessionMode: 'standing' });
  }

  async terminate(conversationId: string): Promise<void> {
    let subscriptionsToCleanup: TriggerSubscription[] = [];

    await this.withOCC(conversationId, (source) => {
      const standingSession = getStandingSession(source);
      subscriptionsToCleanup = [...standingSession.trigger_subscriptions];
      return updateStandingSession(source, {
        ...standingSession,
        status: 'terminated',
        trigger_subscriptions: [],
        pending_triggers: [],
      });
    });

    // Cleanup runs after the OCC write succeeds — retries can't multiply side effects.
    await this.cleanupSubscriptions(conversationId, subscriptionsToCleanup);
  }

  async enqueueTrigger(
    conversationId: string,
    context: TriggerContext
  ): Promise<EnqueueTriggerResult> {
    // Pre-flight: if the session appears active but the execution that "owns" that
    // active status is already done, reset to idle so the trigger starts immediately
    // instead of being queued behind a ghost execution.
    await this.resetIfDeadActive(conversationId);

    let resultStatus: 'injected' | 'queued' = 'queued';
    let triggerToStart: TriggerContext | undefined;
    let agentId: string | undefined;
    let connectorId: string | undefined;
    let systemPromptOverride: string | undefined;

    await this.withOCC(conversationId, (source) => {
      const standingSession = getStandingSession(source);

      if (standingSession.status === 'terminated') {
        throw new Error(`Session ${conversationId} is terminated`);
      }

      if (standingSession.status === 'active') {
        const pendingEvent: PendingTriggerEvent = {
          id: uuidv4(),
          queued_at: new Date().toISOString(),
          context,
        };
        resultStatus = 'queued';
        return updateStandingSession(source, {
          ...standingSession,
          pending_triggers: [...standingSession.pending_triggers, pendingEvent],
        });
      }

      // Status is 'idle' — start immediately.
      resultStatus = 'injected';
      triggerToStart = context;
      agentId = source.agent_id;
      connectorId = standingSession.connector_id;
      systemPromptOverride = standingSession.system_prompt_override;

      return updateStandingSession(source, {
        ...standingSession,
        status: 'active',
        last_active_at: new Date().toISOString(),
      });
    });

    if (triggerToStart && agentId) {
      this.startRound(
        conversationId,
        agentId,
        triggerToStart,
        connectorId,
        systemPromptOverride
      ).catch((err) => {
        this.logger.error(`Failed to start round for session ${conversationId}: ${err}`);
      });
    }

    return { status: resultStatus };
  }

  async drainQueue(conversationId: string, forExecutionId?: string): Promise<void> {
    let triggerToStart: TriggerContext | undefined;
    let agentId: string | undefined;
    let connectorId: string | undefined;
    let systemPromptOverride: string | undefined;

    await this.withOCC(conversationId, (source) => {
      const standingSession = source.state?.standing_session;
      if (!standingSession) return source; // not a standing session, no-op

      // Safety guard: only skip when active_execution_id is set AND mismatches.
      // If active_execution_id is null (e.g. due to a transient write failure in startRound),
      // proceed rather than deadlocking the session in active state forever.
      if (
        forExecutionId &&
        standingSession.active_execution_id &&
        standingSession.active_execution_id !== forExecutionId
      ) {
        return source; // another round is already running
      }

      if (standingSession.status === 'terminated') return source; // no-op

      if (standingSession.pending_triggers.length === 0) {
        // Already idle with nothing pending — skip the write.
        if (standingSession.status === 'idle' && standingSession.active_execution_id == null) {
          return source;
        }
        return updateStandingSession(source, {
          ...standingSession,
          status: 'idle',
          last_active_at: new Date().toISOString(),
          active_execution_id: undefined,
        });
      }

      const [next, ...remaining] = standingSession.pending_triggers;
      triggerToStart = next.context;
      agentId = source.agent_id;
      connectorId = standingSession.connector_id;
      systemPromptOverride = standingSession.system_prompt_override;

      return updateStandingSession(source, {
        ...standingSession,
        status: 'active',
        last_active_at: new Date().toISOString(),
        active_execution_id: undefined, // will be set by startRound
        pending_triggers: remaining,
      });
    });

    if (triggerToStart && agentId) {
      this.startRound(
        conversationId,
        agentId,
        triggerToStart,
        connectorId,
        systemPromptOverride
      ).catch((err) => {
        this.logger.error(
          `Failed to start round from drain queue for session ${conversationId}: ${err}`
        );
      });
    }
  }

  async addSubscription(conversationId: string, subscription: TriggerSubscription): Promise<void> {
    if (subscription.type === 'schedule_trigger') {
      await this.addScheduleSubscription(
        conversationId,
        subscription as ScheduleTriggerSubscription
      );
      return;
    }
    if (subscription.type === 'reminder_trigger') {
      await this.addReminderSubscription(
        conversationId,
        subscription as ReminderTriggerSubscription
      );
      return;
    }
    if (subscription.type === 'webhook_trigger') {
      await this.addWebhookSubscription(conversationId, subscription as WebhookTriggerSubscription);
      return;
    }
    if (subscription.type === 'alert_trigger') {
      await this.addAlertSubscription(conversationId, subscription as AlertTriggerSubscription);
    }
  }

  async removeSubscription(
    conversationId: string,
    subscriptionId: string
  ): Promise<TriggerSubscription> {
    let removed: TriggerSubscription | undefined;

    await this.withOCC(conversationId, (source) => {
      const ss = getStandingSession(source);
      const index = ss.trigger_subscriptions.findIndex((s) => s.id === subscriptionId);
      if (index === -1) {
        throw new Error(`Subscription "${subscriptionId}" not found on session ${conversationId}`);
      }
      removed = ss.trigger_subscriptions[index];
      const remaining = [
        ...ss.trigger_subscriptions.slice(0, index),
        ...ss.trigger_subscriptions.slice(index + 1),
      ];
      return updateStandingSession(source, { ...ss, trigger_subscriptions: remaining });
    });

    if (!removed) {
      throw new Error(`Subscription "${subscriptionId}" not found on session ${conversationId}`);
    }

    // Cleanup external resources after the state write succeeds.
    await this.cleanupSubscriptions(conversationId, [removed]);
    return removed;
  }

  async setStatus(conversationId: string, status: StandingSessionStatus): Promise<void> {
    await this.withOCC(conversationId, (source) => {
      const ss = getStandingSession(source);
      return updateStandingSession(source, { ...ss, status });
    });
  }

  // ---------------------------------------------------------------------------
  // Private — subscription helpers (two-phase: write placeholder → provision → update)
  // ---------------------------------------------------------------------------

  private async addScheduleSubscription(
    conversationId: string,
    sub: ScheduleTriggerSubscription
  ): Promise<void> {
    if (!sub.config.interval) {
      throw new Error('Cron-based schedules are not yet supported; use "interval" instead.');
    }

    // Phase 1: Write placeholder (task_id: '') so the subscription is tracked.
    await this.writeNewSubscription(conversationId, sub);

    // Phase 2: Schedule the TM task.
    let taskId: string;
    try {
      taskId = await scheduleSessionScheduledTask(
        {
          conversationId,
          subscriptionId: sub.id,
          spaceId: this.space,
          scheduleDescription: sub.config.description,
        },
        { interval: sub.config.interval },
        { taskManager: this.taskManager, request: this.request, logger: this.logger }
      );
    } catch (err) {
      await this.removeSubscriptionFromState(conversationId, sub.id);
      throw err;
    }

    // Phase 3: Stamp the real task_id onto the stored subscription.
    try {
      await this.updateSubscriptionInState(conversationId, { ...sub, task_id: taskId });
    } catch (err) {
      await cancelSessionTriggerTask(scheduledTaskId(conversationId, sub.id), {
        taskManager: this.taskManager,
        logger: this.logger,
      }).catch(() => {});
      await this.removeSubscriptionFromState(conversationId, sub.id).catch(() => {});
      throw err;
    }
  }

  private async addReminderSubscription(
    conversationId: string,
    sub: ReminderTriggerSubscription
  ): Promise<void> {
    // Phase 1: Write placeholder.
    await this.writeNewSubscription(conversationId, sub);

    // Phase 2: Schedule the one-shot TM task.
    let taskId: string;
    try {
      taskId = await scheduleSessionReminderTask(
        { conversationId, subscriptionId: sub.id, spaceId: this.space, note: sub.config.note },
        new Date(sub.config.fires_at),
        { taskManager: this.taskManager, request: this.request, logger: this.logger }
      );
    } catch (err) {
      await this.removeSubscriptionFromState(conversationId, sub.id);
      throw err;
    }

    // Phase 3: Stamp the real task_id.
    try {
      await this.updateSubscriptionInState(conversationId, { ...sub, task_id: taskId });
    } catch (err) {
      await cancelSessionTriggerTask(reminderTaskId(conversationId, sub.id), {
        taskManager: this.taskManager,
        logger: this.logger,
      }).catch(() => {});
      await this.removeSubscriptionFromState(conversationId, sub.id).catch(() => {});
      throw err;
    }
  }

  private async addWebhookSubscription(
    conversationId: string,
    sub: WebhookTriggerSubscription
  ): Promise<void> {
    const tokenRaw = `${conversationId}:${sub.id}:${crypto.randomBytes(16).toString('hex')}`;
    const token = Buffer.from(tokenRaw).toString('base64url');
    // Token generation is pure — no external resource to provision, so no two-phase needed.
    await this.writeNewSubscription(conversationId, {
      ...sub,
      config: { ...sub.config, token },
    });
  }

  private async addAlertSubscription(
    conversationId: string,
    sub: AlertTriggerSubscription
  ): Promise<void> {
    const alertingStart = this.getAlertingStart?.();
    if (!alertingStart) {
      this.logger.warn(
        `Alerting plugin not available; storing alert subscription without wiring rule.`
      );
      await this.writeNewSubscription(conversationId, sub);
      return;
    }

    // Phase 1: Write placeholder (alert_action_id: '') so the subscription is tracked.
    await this.writeNewSubscription(conversationId, sub);

    // Phase 2: Create connector and wire it to the alert rule.
    let connectorId: string;
    try {
      const actionsClient = await this.getActionsStart().getActionsClientWithRequest(this.request);
      const connector = await actionsClient.create({
        action: {
          name: `Agent session trigger - ${sub.id}`,
          actionTypeId: AGENT_SESSION_ALERT_CONNECTOR_TYPE_ID,
          config: {},
          secrets: {},
        },
      });
      connectorId = connector.id;

      try {
        const rulesClient = await alertingStart.getRulesClientWithRequest(this.request);
        const rule = await rulesClient.get({ id: sub.config.rule_id });
        const currentActions = rule.actions.map((a) => ({
          id: a.id,
          group: a.group,
          params: a.params,
          frequency: a.frequency,
          uuid: a.uuid,
          alertsFilter: a.alertsFilter,
        }));
        await rulesClient.bulkEdit({
          ids: [sub.config.rule_id],
          operations: [
            {
              field: 'actions',
              operation: 'set',
              value: [
                ...currentActions,
                {
                  id: connectorId,
                  group: 'default',
                  params: { conversation_id: conversationId, subscription_id: sub.id },
                  frequency: {
                    notifyWhen: 'onActiveAlert' as const,
                    summary: false,
                    throttle: null,
                  },
                },
              ],
            },
          ],
        });
      } catch (ruleErr) {
        // Rule update failed — delete the orphaned connector.
        await actionsClient.delete({ id: connectorId }).catch(() => {});
        throw ruleErr;
      }
    } catch (err) {
      // Phase 2 failed entirely — remove the placeholder from state.
      await this.removeSubscriptionFromState(conversationId, sub.id).catch(() => {});
      throw err;
    }

    // Phase 3: Stamp the real connector ID onto the stored subscription.
    try {
      await this.updateSubscriptionInState(conversationId, {
        ...sub,
        alert_action_id: connectorId,
      });
    } catch (err) {
      // Phase 3 failed — clean up the external resource and the placeholder.
      await this.cleanupAlertSubscription({ ...sub, alert_action_id: connectorId }).catch(() => {});
      await this.removeSubscriptionFromState(conversationId, sub.id).catch(() => {});
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Private — cleanup helpers
  // ---------------------------------------------------------------------------

  /**
   * Clean up all external resources for the given subscriptions (TM tasks, alert connectors).
   * Called after the OCC write completes so retries can't multiply side effects.
   * Individual errors are logged but do not propagate — partial cleanup is acceptable.
   */
  private async cleanupSubscriptions(
    conversationId: string,
    subscriptions: TriggerSubscription[]
  ): Promise<void> {
    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          if (sub.type === 'schedule_trigger') {
            await cancelSessionTriggerTask(scheduledTaskId(conversationId, sub.id), {
              taskManager: this.taskManager,
              logger: this.logger,
            });
          } else if (sub.type === 'reminder_trigger') {
            await cancelSessionTriggerTask(reminderTaskId(conversationId, sub.id), {
              taskManager: this.taskManager,
              logger: this.logger,
            });
          } else if (sub.type === 'alert_trigger') {
            await this.cleanupAlertSubscription(sub as AlertTriggerSubscription);
          }
        } catch (err) {
          this.logger.warn(
            `Failed to clean up subscription ${sub.id} (${sub.type}) for session ${conversationId}: ${err}`
          );
        }
      })
    );
  }

  /**
   * Remove the connector instance and rule action for an alert subscription.
   * Splits rule and connector cleanup so that a deleted rule doesn't prevent
   * the connector from being removed.
   */
  private async cleanupAlertSubscription(sub: AlertTriggerSubscription): Promise<void> {
    const alertingStart = this.getAlertingStart?.();
    if (!alertingStart || !sub.alert_action_id) return;

    // Remove from the rule — non-fatal if the rule was already deleted.
    try {
      const rulesClient = await alertingStart.getRulesClientWithRequest(this.request);
      const rule = await rulesClient.get({ id: sub.config.rule_id });
      const filteredActions = rule.actions
        .filter((a) => a.id !== sub.alert_action_id)
        .map((a) => ({
          id: a.id,
          group: a.group,
          params: a.params,
          frequency: a.frequency,
          uuid: a.uuid,
        }));
      await rulesClient.bulkEdit({
        ids: [sub.config.rule_id],
        operations: [{ field: 'actions', operation: 'set', value: filteredActions }],
      });
    } catch (ruleErr) {
      // Rule may have been deleted — log and proceed to delete the connector.
      this.logger.debug(
        `Could not remove action from rule ${sub.config.rule_id} (may be deleted): ${ruleErr}`
      );
    }

    // Always attempt to delete the connector regardless of rule cleanup outcome.
    const actionsClient = await this.getActionsStart().getActionsClientWithRequest(this.request);
    await actionsClient.delete({ id: sub.alert_action_id });
  }

  // ---------------------------------------------------------------------------
  // Private — OCC state mutation helpers
  // ---------------------------------------------------------------------------

  /**
   * Optimistic concurrency control wrapper.
   * The operation callback MUST be pure (no side effects) since it may run
   * multiple times on 409 conflicts. Returns the same reference to skip the write.
   * Retries up to MAX_RETRIES total attempts.
   */
  private async withOCC(
    conversationId: string,
    operation: (source: ConversationProperties) => ConversationProperties
  ): Promise<void> {
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
      const doc = await this.esClient.get<ConversationProperties>({
        index: conversationIndexName,
        id: conversationId,
      });

      if (!doc._source) {
        throw new Error(`Session document ${conversationId} not found`);
      }

      const updated = operation(doc._source);

      // Skip the write if the operation produced no change (avoids pointless seq_no bumps).
      if (updated === doc._source) return;

      try {
        await this.esClient.index({
          index: conversationIndexName,
          id: conversationId,
          document: updated,
          if_seq_no: doc._seq_no,
          if_primary_term: doc._primary_term,
        });
        return;
      } catch (err) {
        const statusCode =
          (err as { statusCode?: number })?.statusCode ??
          (err as { meta?: { statusCode?: number } })?.meta?.statusCode;

        if (statusCode === 409 && attempts < MAX_RETRIES - 1) {
          attempts++;
          continue;
        }
        throw err;
      }
    }
  }

  /** Append a new subscription to the session's trigger_subscriptions list. */
  private async writeNewSubscription(
    conversationId: string,
    subscription: TriggerSubscription
  ): Promise<void> {
    await this.withOCC(conversationId, (source) => {
      const ss = getStandingSession(source);
      if (ss.status === 'terminated') {
        throw new Error(`Session ${conversationId} is terminated`);
      }
      return updateStandingSession(source, {
        ...ss,
        trigger_subscriptions: [...ss.trigger_subscriptions, subscription],
      });
    });
  }

  /** Update a specific subscription in-place, identified by `updatedSub.id`. */
  private async updateSubscriptionInState(
    conversationId: string,
    updatedSub: TriggerSubscription
  ): Promise<void> {
    await this.withOCC(conversationId, (source) => {
      const ss = getStandingSession(source);
      const subscriptions = ss.trigger_subscriptions.map((s) =>
        s.id === updatedSub.id ? updatedSub : s
      );
      return updateStandingSession(source, { ...ss, trigger_subscriptions: subscriptions });
    });
  }

  /** Remove a subscription from state without cleaning up any external resources. */
  private async removeSubscriptionFromState(
    conversationId: string,
    subscriptionId: string
  ): Promise<void> {
    await this.withOCC(conversationId, (source) => {
      const ss = source.state?.standing_session;
      if (!ss) return source;
      const remaining = ss.trigger_subscriptions.filter((s) => s.id !== subscriptionId);
      if (remaining.length === ss.trigger_subscriptions.length) return source; // not found, no-op
      return updateStandingSession(source, { ...ss, trigger_subscriptions: remaining });
    });
  }

  // ---------------------------------------------------------------------------
  // Private — round execution
  // ---------------------------------------------------------------------------

  /**
   * If the session is `active` but the execution that set that status is no longer
   * running (completed, failed, or gone), reset the session to `idle`.
   * This recovers sessions that got stuck when the post-round drainQueue hook
   * wasn't reached (e.g. server restart, hook not yet deployed).
   */
  private async resetIfDeadActive(conversationId: string): Promise<void> {
    const doc = await this.esClient
      .get<ConversationProperties>({
        index: conversationIndexName,
        id: conversationId,
      })
      .catch(() => null);

    const ss = doc?._source?.state?.standing_session;
    if (!ss || ss.status !== 'active' || !ss.active_execution_id) return;

    const execution = await this.getExecutionService()
      .getExecution(ss.active_execution_id)
      .catch(() => undefined);

    const isAlive =
      execution?.status === ExecutionStatus.running ||
      execution?.status === ExecutionStatus.scheduled;

    if (!isAlive) {
      this.logger.debug(
        `[session] ${conversationId} stuck active (execution ${ss.active_execution_id} is ${
          execution?.status ?? 'not found'
        }); resetting to idle`
      );
      await this.withOCC(conversationId, (source) => {
        const standingSession = source.state?.standing_session;
        if (!standingSession || standingSession.status !== 'active') return source;
        if (standingSession.active_execution_id !== ss.active_execution_id) return source;
        return updateStandingSession(source, {
          ...standingSession,
          status: 'idle',
          active_execution_id: undefined,
        });
      });
    }
  }

  private async startRound(
    conversationId: string,
    agentId: string,
    triggerContext: TriggerContext,
    connectorId?: string,
    systemPromptOverride?: string
  ): Promise<void> {
    const executionService = this.getExecutionService();
    try {
      const { executionId } = await executionService.executeAgent({
        request: this.request,
        // Always schedule on Task Manager so the round runs with a fakeRequest
        // that is not tied to any HTTP connection lifecycle. Without this, rounds
        // triggered from live HTTP requests (e.g. the messages endpoint) are aborted
        // the moment the HTTP response is sent and the connection is closed.
        useTaskManager: true,
        mode: AgentExecutionMode.conversation,
        params: {
          conversationId,
          agentId,
          ...(connectorId && { connectorId }),
          ...(systemPromptOverride && {
            configurationOverrides: { instructions: systemPromptOverride },
          }),
          nextInput: {
            message: formatTriggerMessage(triggerContext),
            source: triggerContext.type,
            trigger_context: triggerContext,
          },
        },
      });

      // Store the executionId so the post-round hook can perform the safety check.
      await this.withOCC(conversationId, (source) => {
        const ss = source.state?.standing_session;
        if (!ss) return source;
        return updateStandingSession(source, { ...ss, active_execution_id: executionId });
      });
    } catch (err) {
      // Roll back to idle so the session doesn't get permanently stuck in active.
      await this.setStatus(conversationId, 'idle').catch((setErr) => {
        this.logger.error(
          `Failed to reset session ${conversationId} to idle after execution start failure: ${setErr}`
        );
      });
      throw err;
    }
  }
}
