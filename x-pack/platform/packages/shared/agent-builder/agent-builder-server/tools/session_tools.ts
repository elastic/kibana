/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { v4 as uuidv4 } from 'uuid';
import { ToolType } from '@kbn/agent-builder-common';
import type {
  AlertTriggerSubscription,
  ScheduleTriggerSubscription,
  ReminderTriggerSubscription,
  WebhookTriggerSubscription,
} from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from './builtin';
import type { RunContext } from '../runner';
import { getAgentFromRunContext } from '../runner';
import type { SessionsStart } from '../sessions';
import { createOtherResult, createErrorResult } from './utils';

// ---------------------------------------------------------------------------
// Constant — all session tool IDs, used to inject them into standing session runs
// ---------------------------------------------------------------------------

export const SESSION_TOOL_IDS = [
  'session.set_idle',
  'session.terminate',
  'session.subscribe_to_alert',
  'session.subscribe_to_schedule',
  'session.set_reminder',
  'session.subscribe_to_webhook',
  'session.unsubscribe',
  'session.send_message',
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const otherResult = (content: string) => ({
  results: [createOtherResult({ content })],
});

const errResult = (message: string) => ({
  results: [createErrorResult(`Error: ${message}`)],
});

/** Resolve conversationId from run context — throws if not in a conversation. */
const requireConversationId = (runContext: RunContext): string => {
  const agentEntry = getAgentFromRunContext(runContext);
  const id = agentEntry?.conversationId;
  if (!id) {
    throw new Error('session tools are only available inside a standing session conversation');
  }
  return id;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates the set of built-in session lifecycle tools.
 * The session service is injected via closure so tools can call back into it.
 *
 * These tools are only registered for conversations with session_mode === 'standing'.
 * The `session` namespace is protected, so no user-registered tool can shadow them.
 */
export const createSessionTools = (sessions: SessionsStart): BuiltinToolDefinition[] => {
  // -------------------------------------------------------------------------
  // session.set_idle
  // -------------------------------------------------------------------------
  const setIdle: BuiltinToolDefinition = {
    id: 'session.set_idle',
    type: ToolType.builtin,
    tags: [],
    description:
      'Signal that you have finished your current work and the session should go idle ' +
      'until the next trigger event or human message arrives. Call this when you have ' +
      'completed all tasks for this round and do not need to take any further action right now.',
    schema: z.object({}),
    handler: async (_params, context) => {
      const conversationId = requireConversationId(context.runContext);
      const agentEntry = getAgentFromRunContext(context.runContext);
      const executionId = agentEntry?.executionId;
      const client = sessions.getScopedClient({ request: context.request });
      await client.drainQueue(conversationId, executionId);
      return otherResult(
        'Round complete. Session will process the next queued trigger or return to idle.'
      );
    },
  };

  // -------------------------------------------------------------------------
  // session.terminate
  // -------------------------------------------------------------------------
  const terminate: BuiltinToolDefinition = {
    id: 'session.terminate',
    type: ToolType.builtin,
    tags: [],
    description:
      'Permanently end this standing session. All trigger subscriptions will be removed and ' +
      'no further trigger events or human messages will be processed. This action cannot be undone.',
    schema: z.object({
      reason: z.string().optional().describe('Optional reason for termination, stored for audit.'),
    }),
    handler: async (_params, context) => {
      const conversationId = requireConversationId(context.runContext);
      const client = sessions.getScopedClient({ request: context.request });
      await client.terminate(conversationId);
      return otherResult('Session has been terminated. All subscriptions removed.');
    },
  };

  // -------------------------------------------------------------------------
  // session.subscribe_to_alert
  // -------------------------------------------------------------------------
  const subscribeToAlertSchema = z.object({
    rule_id: z.string().describe('ID of the Kibana alert rule to subscribe to.'),
    rule_name: z
      .string()
      .optional()
      .describe('Human-readable name of the rule, stored for display purposes.'),
  });

  const subscribeToAlert: BuiltinToolDefinition<typeof subscribeToAlertSchema> = {
    id: 'session.subscribe_to_alert',
    type: ToolType.builtin,
    tags: [],
    description:
      'Subscribe to a Kibana alert rule. When the rule fires, a new round will be started ' +
      'in this session with the alert details injected as the input. ' +
      'Returns a subscription ID you can use to unsubscribe later.',
    schema: subscribeToAlertSchema,
    handler: async (params, context) => {
      const conversationId = requireConversationId(context.runContext);
      const client = sessions.getScopedClient({ request: context.request });

      const subscriptionId = uuidv4();
      const subscription: AlertTriggerSubscription = {
        id: subscriptionId,
        type: 'alert_trigger',
        config: { rule_id: params.rule_id, rule_name: params.rule_name },
        alert_action_id: '',
        created_at: new Date().toISOString(),
      };

      await client.addSubscription(conversationId, subscription);
      return otherResult(
        JSON.stringify({ subscription_id: subscriptionId, rule_id: params.rule_id })
      );
    },
  };

  // -------------------------------------------------------------------------
  // session.subscribe_to_schedule
  // -------------------------------------------------------------------------
  const subscribeToScheduleSchema = z.object({
    interval: z.string().describe('Simple interval string, e.g. "15m", "1h", "30s".'),
    description: z
      .string()
      .optional()
      .describe('Human-readable description of the schedule, e.g. "every 15 minutes".'),
  });

  const subscribeToSchedule: BuiltinToolDefinition<typeof subscribeToScheduleSchema> = {
    id: 'session.subscribe_to_schedule',
    type: ToolType.builtin,
    tags: [],
    description:
      'Subscribe to a recurring time-based schedule. A new session round will be started ' +
      'on each tick. Use "interval" (e.g. "15m", "1h") to specify the schedule frequency. ' +
      'Returns a subscription ID you can use to unsubscribe later.',
    schema: subscribeToScheduleSchema,
    handler: async (params, context) => {
      if (!params.interval) {
        return errResult('"interval" must be provided.');
      }

      const conversationId = requireConversationId(context.runContext);
      const client = sessions.getScopedClient({ request: context.request });

      const subscriptionId = uuidv4();
      const scheduleDescription = params.description ?? `every ${params.interval}`;

      const subscription: ScheduleTriggerSubscription = {
        id: subscriptionId,
        type: 'schedule_trigger',
        config: {
          interval: params.interval,
          description: scheduleDescription,
        },
        task_id: '',
        created_at: new Date().toISOString(),
      };

      await client.addSubscription(conversationId, subscription);
      return otherResult(
        JSON.stringify({ subscription_id: subscriptionId, description: scheduleDescription })
      );
    },
  };

  // -------------------------------------------------------------------------
  // session.set_reminder
  // -------------------------------------------------------------------------
  const setReminderSchema = z.object({
    in_seconds: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Delay in seconds from now. Mutually exclusive with "at".'),
    at: z
      .string()
      .optional()
      .describe(
        'Absolute datetime to fire the reminder, in ISO 8601 format. Mutually exclusive with "in_seconds".'
      ),
    note: z
      .string()
      .optional()
      .describe('Optional label echoed back when the reminder fires so you can identify it.'),
  });

  const setReminder: BuiltinToolDefinition<typeof setReminderSchema> = {
    id: 'session.set_reminder',
    type: ToolType.builtin,
    tags: [],
    description:
      'Schedule a one-time reminder that wakes this session after a delay or at a specific time. ' +
      'Unlike a recurring schedule, reminders fire exactly once and then auto-remove. ' +
      'Provide either "in_seconds" (relative delay) or "at" (absolute ISO 8601 datetime).',
    schema: setReminderSchema,
    handler: async (params, context) => {
      if (!params.in_seconds && !params.at) {
        return errResult('Either "in_seconds" or "at" must be provided.');
      }
      if (params.in_seconds && params.at) {
        return errResult('"in_seconds" and "at" are mutually exclusive.');
      }

      const conversationId = requireConversationId(context.runContext);
      const client = sessions.getScopedClient({ request: context.request });

      const delayMs = params.in_seconds ? params.in_seconds * 1000 : 0;
      const firesAt = params.at
        ? new Date(params.at).toISOString()
        : new Date(Date.now() + delayMs).toISOString();

      const subscriptionId = uuidv4();
      const subscription: ReminderTriggerSubscription = {
        id: subscriptionId,
        type: 'reminder_trigger',
        one_shot: true,
        config: { fires_at: firesAt, note: params.note },
        task_id: '',
        created_at: new Date().toISOString(),
      };

      await client.addSubscription(conversationId, subscription);
      return otherResult(JSON.stringify({ reminder_id: subscriptionId, fires_at: firesAt }));
    },
  };

  // -------------------------------------------------------------------------
  // session.subscribe_to_webhook
  // -------------------------------------------------------------------------
  const subscribeToWebhookSchema = z.object({
    expires_at: z
      .string()
      .optional()
      .describe(
        'Optional expiry datetime in ISO 8601 format. After this time the webhook rejects requests.'
      ),
  });

  const subscribeToWebhook: BuiltinToolDefinition<typeof subscribeToWebhookSchema> = {
    id: 'session.subscribe_to_webhook',
    type: ToolType.builtin,
    tags: [],
    description:
      'Generate a signed webhook URL. Any HTTP POST to this URL will start a new session round ' +
      'with the request body as the trigger payload. ' +
      'Returns the webhook URL and a subscription ID you can use to unsubscribe.',
    schema: subscribeToWebhookSchema,
    handler: async (params, context) => {
      const conversationId = requireConversationId(context.runContext);
      const client = sessions.getScopedClient({ request: context.request });

      const subscriptionId = uuidv4();
      const subscription: WebhookTriggerSubscription = {
        id: subscriptionId,
        type: 'webhook_trigger',
        config: { token: '', expires_at: params.expires_at },
        created_at: new Date().toISOString(),
      };

      await client.addSubscription(conversationId, subscription);

      // Re-read so the session service can write back the real token.
      const session = await client.get(conversationId);
      const saved = session.state?.standing_session?.trigger_subscriptions.find(
        (s) => s.id === subscriptionId
      ) as WebhookTriggerSubscription | undefined;

      const token = saved?.config.token ?? '(pending — check session state)';
      return otherResult(
        JSON.stringify({
          subscription_id: subscriptionId,
          webhook_url: `/internal/agent_builder/sessions/webhook/${token}`,
          expires_at: params.expires_at ?? null,
        })
      );
    },
  };

  // -------------------------------------------------------------------------
  // session.unsubscribe
  // -------------------------------------------------------------------------
  const unsubscribeSchema = z.object({
    subscription_id: z.string().describe('ID of the subscription to remove.'),
  });

  const unsubscribe: BuiltinToolDefinition<typeof unsubscribeSchema> = {
    id: 'session.unsubscribe',
    type: ToolType.builtin,
    tags: [],
    description:
      'Remove a trigger subscription by its ID. ' +
      'The associated Task Manager task, alert action, or webhook token will be cleaned up.',
    schema: unsubscribeSchema,
    handler: async (params, context) => {
      const conversationId = requireConversationId(context.runContext);
      const client = sessions.getScopedClient({ request: context.request });

      try {
        const removed = await client.removeSubscription(conversationId, params.subscription_id);
        return otherResult(
          JSON.stringify({ removed_subscription_id: removed.id, type: removed.type })
        );
      } catch (err) {
        return errResult(`Subscription "${params.subscription_id}" not found.`);
      }
    },
  };

  // -------------------------------------------------------------------------
  // session.send_message
  // -------------------------------------------------------------------------
  const sendMessageSchema = z.object({
    target_session_id: z.string().describe('Conversation ID of the target standing session.'),
    message: z.string().describe('Free-text message to send to the target session.'),
    context: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Optional structured metadata attached to the message.'),
  });

  const sendMessage: BuiltinToolDefinition<typeof sendMessageSchema> = {
    id: 'session.send_message',
    type: ToolType.builtin,
    tags: [],
    description:
      "Inject a message into another standing session's trigger queue. " +
      'The message arrives as a new round input with source "session_message". ' +
      'This is fire-and-forget: the tool returns once the message is queued or injected. ' +
      'The target session must exist in the same space and must not be terminated.',
    schema: sendMessageSchema,
    handler: async (params, context) => {
      const fromConversationId = requireConversationId(context.runContext);
      const client = sessions.getScopedClient({ request: context.request });

      let fromAgentId: string;
      try {
        const fromSession = await client.get(fromConversationId);
        fromAgentId = fromSession.agent_id;
      } catch {
        return errResult('Could not resolve the current session.');
      }

      const messageId = uuidv4();
      const triggerContext = {
        type: 'session_message' as const,
        subscription_id: undefined,
        event: {
          from_session_id: fromConversationId,
          from_agent_id: fromAgentId,
          message: params.message,
          message_id: messageId,
          context: params.context,
        },
      };

      try {
        const result = await client.enqueueTrigger(params.target_session_id, triggerContext);
        return otherResult(JSON.stringify({ message_id: messageId, status: result.status }));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return errResult(
          `Could not deliver message to session "${params.target_session_id}": ${msg}`
        );
      }
    },
  };

  return [
    setIdle,
    terminate,
    subscribeToAlert,
    subscribeToSchedule,
    setReminder,
    subscribeToWebhook,
    unsubscribe,
    sendMessage,
  ];
};
