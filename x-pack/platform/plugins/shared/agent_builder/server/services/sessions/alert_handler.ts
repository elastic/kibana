/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { AlertingConnectorFeatureId } from '@kbn/actions-plugin/common';
import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions,
  ActionTypeExecutorResult,
} from '@kbn/actions-plugin/server/types';
import type { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';
import type { Logger } from '@kbn/logging';
import type { AlertTriggerContext } from '@kbn/agent-builder-common';
import type { SessionsStart } from '@kbn/agent-builder-server';

// ---------------------------------------------------------------------------
// Connector type ID
// ---------------------------------------------------------------------------

/**
 * System action type ID for the agent session alert handler.
 * Used when creating/attaching actions to Kibana alert rules.
 */
export const AGENT_SESSION_ALERT_CONNECTOR_TYPE_ID = '.agent-session-alert';

// ---------------------------------------------------------------------------
// Executor params schema — the config stored on the rule action
// ---------------------------------------------------------------------------

const ExecutorParamsSchema = z.object({
  /** The standing session conversation ID to notify when this alert fires. */
  conversation_id: z.string(),
  /** The subscription ID (from TriggerSubscription.id) for correlation. */
  subscription_id: z.string(),
});

type ExecutorParams = z.infer<typeof ExecutorParamsSchema>;

// ---------------------------------------------------------------------------
// Alert event shape coming from the alerting framework
// ---------------------------------------------------------------------------

interface AlertActionContext {
  alerts?: Array<{
    id?: string;
    status?: string;
    severity?: string;
    [key: string]: unknown;
  }>;
  rule?: {
    id?: string;
    name?: string;
    tags?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Connector type factory
// ---------------------------------------------------------------------------

interface CreateAlertConnectorTypeDeps {
  logger: Logger;
  getSessionsStart: () => SessionsStart;
}

/**
 * Returns the connector type definition for the agent session alert action.
 * Register this with `actions.registerType()` during plugin setup.
 *
 * When an alert rule fires and this action is attached:
 * 1. The alerting framework calls the executor with the alert context.
 * 2. The executor looks up the standing session via conversation_id.
 * 3. It enqueues an alert_trigger event into the session queue.
 */
export const createAgentSessionAlertConnectorType = ({
  logger,
  getSessionsStart,
}: CreateAlertConnectorTypeDeps): ConnectorType<
  Record<string, unknown>,
  Record<string, unknown>,
  ExecutorParams,
  void
> => ({
  id: AGENT_SESSION_ALERT_CONNECTOR_TYPE_ID,
  name: 'Notify Agent Session',
  minimumLicenseRequired: 'enterprise',
  supportedFeatureIds: [AlertingConnectorFeatureId],
  validate: {
    params: { schema: ExecutorParamsSchema },
    config: { schema: z.object({}).passthrough() },
    secrets: { schema: z.object({}).passthrough() },
  },
  executor: async (
    options: ActionTypeExecutorOptions<
      Record<string, unknown>,
      Record<string, unknown>,
      ExecutorParams
    >
  ): Promise<ActionTypeExecutorResult<void>> => {
    const { params, request: maybeRequest, actionId } = options;
    const { conversation_id: conversationId, subscription_id: subscriptionId } = params;

    if (!maybeRequest) {
      logger.error(
        `[${AGENT_SESSION_ALERT_CONNECTOR_TYPE_ID}] No request context — cannot enqueue trigger for session ${conversationId}`
      );
      return { actionId, status: 'error', message: 'No request context available', retry: false };
    }

    const request = maybeRequest;

    // The alerting framework passes the alert context via the execution context.
    // Extract what we can from the available data.
    const alertContext = (options as unknown as { alertsFilter?: AlertActionContext })
      .alertsFilter as AlertActionContext | undefined;

    const triggerContext: AlertTriggerContext = {
      type: 'alert_trigger',
      subscription_id: subscriptionId,
      event: {
        rule_id: alertContext?.rule?.id ?? 'unknown',
        rule_name: alertContext?.rule?.name ?? 'unknown',
        alert_ids: (alertContext?.alerts ?? []).map((a) => a.id ?? '').filter(Boolean),
        severity: alertContext?.alerts?.[0]?.severity,
        tags: alertContext?.rule?.tags,
        context: alertContext,
      },
    };

    try {
      const sessions = getSessionsStart();
      // Alert actions receive a `request` scoped to the rule creator's API key.
      // This matches the "creator credentials" model.
      const client = sessions.getScopedClient({ request });
      await client.enqueueTrigger(conversationId, triggerContext);

      logger.debug(
        `[${AGENT_SESSION_ALERT_CONNECTOR_TYPE_ID}] Alert enqueued for session ${conversationId}, ` +
          `subscription ${subscriptionId}, action ${actionId}`
      );

      return { actionId, status: 'ok' };
    } catch (err) {
      logger.error(
        `[${AGENT_SESSION_ALERT_CONNECTOR_TYPE_ID}] Failed to enqueue alert for session ${conversationId}: ${err}`
      );
      return {
        actionId,
        status: 'error',
        message: `Failed to notify agent session: ${
          err instanceof Error ? err.message : String(err)
        }`,
        retry: true,
      };
    }
  },
});

// ---------------------------------------------------------------------------
// Registration helper
// ---------------------------------------------------------------------------

/**
 * Register the agent session alert connector type during plugin setup.
 */
export const registerAgentSessionAlertConnectorType = (
  actions: ActionsPluginSetupContract,
  deps: CreateAlertConnectorTypeDeps
): void => {
  actions.registerType(createAgentSessionAlertConnectorType(deps));
};
