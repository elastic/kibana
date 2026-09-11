/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput, AttachmentRefActor } from '@kbn/agent-builder-common/attachments';
import { getLatestVersion, getContentKey } from '@kbn/agent-builder-common/attachments';
import type {
  AttachmentResolveContext,
  AttachmentStateManager,
} from '@kbn/agent-builder-server/attachments';

/**
 * Promotes attachment inputs carried by a user message into conversation-level versioned
 * attachments: an input matching a stored id updates it, an input whose content is already
 * stored is skipped, and anything else is added.
 */
export const mergeAttachmentInputs = async ({
  stateManager,
  inputs,
  actor,
  resolveContext,
  updateOriginSnapshot,
}: {
  stateManager: AttachmentStateManager;
  inputs: AttachmentInput[];
  actor: AttachmentRefActor;
  resolveContext: AttachmentResolveContext;
  updateOriginSnapshot?: boolean;
}): Promise<void> => {
  if (inputs.length === 0) {
    return;
  }

  const storedIdByContentKey = new Map<string, string>();
  for (const stored of stateManager.getAll()) {
    const latest = getLatestVersion(stored);
    if (latest) {
      storedIdByContentKey.set(`${stored.type}:${latest.content_hash}`, stored.id);
    }
  }

  for (const input of inputs) {
    const { id } = input;
    const existing = id ? stateManager.getAttachmentRecord(id) : undefined;

    if (id && existing) {
      await stateManager.update(
        id,
        { data: input.data, ...(input.hidden !== undefined ? { hidden: input.hidden } : {}) },
        actor
      );

      if (updateOriginSnapshot && existing.origin !== undefined) {
        await stateManager.updateOrigin(id, existing.origin, actor);
      }

      continue;
    }

    if (storedIdByContentKey.has(getContentKey(input, 'unknown'))) {
      continue;
    }

    const created = await stateManager.add(
      {
        ...(input.id ? { id: input.id } : {}),
        type: input.type,
        data: input.data,
        ...(input.origin !== undefined ? { origin: input.origin } : {}),
        ...(input.hidden !== undefined ? { hidden: input.hidden } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.group_id !== undefined ? { group_id: input.group_id } : {}),
      },
      actor,
      resolveContext
    );

    const latest = getLatestVersion(created);
    if (latest) {
      storedIdByContentKey.set(`${created.type}:${latest.content_hash}`, created.id);
    }
  }
};
