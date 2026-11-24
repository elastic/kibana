/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  DEFAULT_SESSION_MEMORIES_READ_SIZE,
  readSessionMemoriesStepCommonDefinition,
  type ReadSessionMemoriesOutput,
} from '../../common/step_types/read_session_memories';
import { assertAiIndexReadable } from './read_session_helpers';
import { SESSION_MEMORY_ID_PREFIX } from '../dreaming/ids';
import type { SessionMemory } from '../session_memory/types';
import type { DreamingStepDependencies } from './helpers';

/** The memory type of a session memory read for dreaming. */
export const SESSION_MEMORY_TYPE = 'memory.session';

const MAX_TITLE_CHARS = 120;

const titleOf = (content: string): string => {
  const [firstLine = ''] = content.trim().split('\n');
  return firstLine.length > MAX_TITLE_CHARS
    ? `${firstLine.slice(0, MAX_TITLE_CHARS)} […]`
    : firstLine;
};

const toMemory = (
  { id, sessionId, content, attributes, revisedAt }: SessionMemory,
  spaceId: string
): ReadSessionMemoriesOutput['memories'][number] => ({
  id: `${SESSION_MEMORY_ID_PREFIX}${id}`,
  type: SESSION_MEMORY_TYPE,
  title: titleOf(content),
  content,
  updated_at: revisedAt,
  attributes: { ...attributes, 'session.id': sessionId },
  permissions: { kibana: { privileges: [{ space: spaceId }] } },
});

/**
 * Reads the session memories saved for an AI index. The store is read as the internal user, after
 * checking that the workflow user can read AI indices in the space.
 */
export const getReadSessionMemoriesStepDefinition = (deps: DreamingStepDependencies) =>
  createServerStepDefinition({
    ...readSessionMemoriesStepCommonDefinition,
    handler: async (context) => {
      const { spaceId } = context.contextManager.getContext().workflow;
      const {
        ai_index_id: aiIndexId,
        since,
        after,
        size = DEFAULT_SESSION_MEMORIES_READ_SIZE,
      } = context.input;
      const empty = { memories: [], resume_from: '', resume_after_id: '' };
      if (!(await assertAiIndexReadable(deps, context, aiIndexId, spaceId))) {
        return { output: empty };
      }

      const { memories, next } = await (
        await deps.getSessionMemoryService()
      ).readRevised({
        space: spaceId,
        aiIndexId,
        since,
        ...(after && { after }),
        size,
      });
      return {
        output: {
          memories: memories.map((memory) => toMemory(memory, spaceId)),
          resume_from: next?.revisedAt ?? '',
          resume_after_id: next?.id ?? '',
        },
      };
    },
  });
