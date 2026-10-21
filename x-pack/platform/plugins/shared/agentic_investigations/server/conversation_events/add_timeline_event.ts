/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';

/**
 * Best-effort: the event is written after the change it describes, so a failed write (e.g. a user
 * who removed their own access) is logged and never fails the change itself.
 */
export const addTimelineEvent = async ({
  client,
  conversationId,
  type,
  data,
  logger,
}: {
  client: ConversationPublicClient;
  conversationId: string;
  type: string;
  data: Record<string, unknown>;
  logger: Logger;
}): Promise<void> => {
  try {
    await client.addEvents({ conversationId, events: [{ type, data }] });
  } catch (error) {
    logger.warn(
      `Failed to add ${type} event to ${conversationId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
