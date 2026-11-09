/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/server';
import type { CasesEventBus } from '../events/event_bus';
import { getRoomAccessControl } from '../client/cases/room';
import type { Case } from '../../common/types/domain';

const accessKey = (theCase: Pick<Case, 'access' | 'assignees'>) =>
  JSON.stringify([
    theCase.access?.mode ?? 'default',
    (theCase.assignees ?? []).map(({ uid }) => uid).sort(),
  ]);

/**
 * Keeps each room's access in step with its case. It hangs off the Cases event bus, so it runs for
 * every way a case changes (UI, API, workflow, agent), as the person who made the change.
 */
export const subscribeRoomAccessToCaseUpdates = ({
  eventBus,
  agentBuilder,
  logger,
}: {
  eventBus: CasesEventBus;
  agentBuilder: AgentBuilderPluginStart;
  logger: Logger;
}): void => {
  eventBus.onCaseUpdated(async (event, { previousCase, updatedCase }) => {
    if (!previousCase || !updatedCase?.room_conversation_id) return;
    const before = {
      access: previousCase.attributes.access,
      assignees: previousCase.attributes.assignees ?? [],
    };
    if (accessKey(before) === accessKey(updatedCase)) return;
    try {
      const conversations = await agentBuilder.conversations.getScopedClient({
        request: event.request,
      });
      await conversations.updateAccessControlAsOwner(
        updatedCase.room_conversation_id,
        getRoomAccessControl(updatedCase)
      );
    } catch (error) {
      logger.warn(
        `Case ${updatedCase.id} changed who can see it, but its room wasn't updated: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  });
};
