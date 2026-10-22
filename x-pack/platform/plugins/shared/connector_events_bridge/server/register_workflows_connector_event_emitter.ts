/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConnectorEventEmitter,
  PluginSetupContract as ActionsPluginSetupContract,
} from '@kbn/actions-plugin/server';
import { HITL_SLACK_ACTION_EVENT_ID } from '@kbn/workflows';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

import {
  buildHitlSlackConfirmationText,
  replaceSlackHitlMessage,
} from './replace_slack_hitl_message';

let emitFailureCount = 0;

/** Emit failures observed by this bridge process. */
export function getConnectorEventEmitFailureCount(): number {
  return emitFailureCount;
}

/** @internal */
export function resetConnectorEventEmitFailureCountForTests(): void {
  emitFailureCount = 0;
}

function isAlreadyClaimedResumeError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const candidate = error as { name?: unknown; statusCode?: unknown };
  return candidate.name === 'ExternalResumeError' && candidate.statusCode === 409;
}

async function resumeHitlFromSlackAction(
  client: {
    resumeExternalHitl: (params: {
      token: string;
      executionId: string;
      stepId: string;
      spaceId: string;
      input: Record<string, unknown>;
    }) => Promise<void>;
  },
  payload: Record<string, unknown>
): Promise<void> {
  const token = typeof payload.token === 'string' ? payload.token : undefined;
  const executionId = typeof payload.executionId === 'string' ? payload.executionId : undefined;
  const stepId = typeof payload.stepId === 'string' ? payload.stepId : undefined;
  const spaceId = typeof payload.spaceId === 'string' ? payload.spaceId : undefined;
  const kind = payload.kind;
  const responseUrl = typeof payload.responseUrl === 'string' ? payload.responseUrl : undefined;

  if (!token || !executionId || !stepId || !spaceId) {
    throw new Error('slack2.hitl_action payload missing resume correlation fields');
  }

  const confirmAndReplace = async (alreadyResponded: boolean): Promise<void> => {
    if (!responseUrl) {
      return;
    }
    await replaceSlackHitlMessage({
      responseUrl,
      text: buildHitlSlackConfirmationText({
        kind,
        approved: payload.approved,
        slackUserId: payload.slackUserId,
        alreadyResponded,
      }),
    });
  };

  try {
    if (kind === 'approval') {
      if (typeof payload.approved !== 'boolean') {
        throw new Error('slack2.hitl_action approval payload missing approved');
      }
      await client.resumeExternalHitl({
        token,
        executionId,
        stepId,
        spaceId,
        input: { approved: payload.approved },
      });
      await confirmAndReplace(false);
      return;
    }

    if (kind === 'input') {
      let input: Record<string, unknown> = {};
      if (typeof payload.inputJson === 'string' && payload.inputJson.length > 0) {
        const parsed = JSON.parse(payload.inputJson) as unknown;
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          input = parsed as Record<string, unknown>;
        }
      }
      await client.resumeExternalHitl({
        token,
        executionId,
        stepId,
        spaceId,
        input,
      });
      await confirmAndReplace(false);
      return;
    }

    throw new Error(`slack2.hitl_action unsupported kind: ${String(kind)}`);
  } catch (error) {
    if (isAlreadyClaimedResumeError(error)) {
      await confirmAndReplace(true);
      return;
    }
    throw error;
  }
}

/**
 * Registers the Phase 1 Workflows emitter on the Actions inbound hub.
 * Forwards the ingest-built last-saver request; never invents a space-only request.
 */
export function registerWorkflowsConnectorEventEmitter({
  actions,
  getWorkflowsExtensionsStart,
}: {
  actions: ActionsPluginSetupContract;
  getWorkflowsExtensionsStart: () => Promise<WorkflowsExtensionsServerPluginStart | undefined>;
}): void {
  const emitter: ConnectorEventEmitter = {
    emit: async ({
      eventId,
      payload,
      spaceId,
      connectorId,
      connectorTypeId,
      correlationKey,
      request,
    }) => {
      const workflowsExtensions = await getWorkflowsExtensionsStart();
      if (!workflowsExtensions) {
        emitFailureCount += 1;
        throw new Error(
          `Workflows extensions unavailable; dropping connector event ${eventId} for connector ${connectorId} space ${spaceId}`
        );
      }

      if (!request.headers.authorization) {
        emitFailureCount += 1;
        throw new Error(
          `Connector event emit requires an authenticated request; dropping event ${eventId} for connector ${connectorId} space ${spaceId}`
        );
      }

      const enriched: Record<string, unknown> = {
        ...payload,
        connectorId,
        connectorTypeId,
        spaceId,
        ...(correlationKey !== undefined ? { correlationKey } : {}),
      };

      try {
        const client = await workflowsExtensions.getClient(request);
        if (eventId === HITL_SLACK_ACTION_EVENT_ID) {
          await resumeHitlFromSlackAction(client, enriched);
          return;
        }
        await client.emitEvent(eventId, enriched);
      } catch (error) {
        emitFailureCount += 1;
        throw error;
      }
    },
  };

  actions.registerConnectorEventEmitter(emitter);
}
