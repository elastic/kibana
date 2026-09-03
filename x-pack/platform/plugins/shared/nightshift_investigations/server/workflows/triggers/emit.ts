/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type {
  InvestigationsTriggerId,
  InvestigationsTriggerPayloadMap,
} from '../../../common/workflows/triggers';

export type TriggerEmitter = <T extends InvestigationsTriggerId>(
  triggerId: T,
  payload: InvestigationsTriggerPayloadMap[T]
) => void;

export const createTriggerEmitter = ({
  workflowsExtensions,
  request,
  logger,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginStart | undefined;
  request: KibanaRequest;
  logger: Logger;
}): TriggerEmitter | undefined => {
  if (!workflowsExtensions) {
    return undefined;
  }

  let clientPromise: ReturnType<WorkflowsExtensionsServerPluginStart['getClient']> | undefined;

  const logFailure = (triggerId: InvestigationsTriggerId, error: unknown): void => {
    logger.warn(
      `Failed to emit nightshift-investigations workflow trigger "${triggerId}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  };

  const resolveClient = async (triggerId: InvestigationsTriggerId) => {
    try {
      clientPromise ??= workflowsExtensions.getClient(request);
      return await clientPromise;
    } catch (error) {
      clientPromise = undefined;
      logFailure(triggerId, error);
      return undefined;
    }
  };

  return (triggerId, payload) => {
    void (async () => {
      const client = await resolveClient(triggerId);
      if (!client) {
        return;
      }

      try {
        await client.emitEvent(triggerId, payload);
      } catch (error) {
        logFailure(triggerId, error);
      }
    })();
  };
};
