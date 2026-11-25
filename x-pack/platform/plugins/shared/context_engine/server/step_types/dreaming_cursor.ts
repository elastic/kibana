/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import {
  getDreamingCursorStepCommonDefinition,
  setDreamingCursorStepCommonDefinition,
  type GetDreamingCursorOutput,
} from '../../common/step_types/dreaming_cursor';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { DreamingKiStepDependencies } from './helpers';
import { assertDreamingAvailable, assertKiWritePrivilege } from './helpers';

type DreamingCursorStepDependencies = Pick<
  DreamingKiStepDependencies,
  'getAiIndexService' | 'isDreamingAvailable' | 'checkWritePrivilege' | 'logger'
>;

const HOUR_MS = 60 * 60 * 1000;

const notFound = (aiIndexId: string) =>
  new ExecutionError({ type: 'NotFoundError', message: `AI index '${aiIndexId}' not found` });

/**
 * A cursor older than `maxHours` moves forward to that age, and its tie-breaker is dropped, as a
 * tie-breaker only means something at the time it was saved for.
 */
export const clampCursor = ({
  cursor,
  now,
  maxHours,
}: {
  cursor: { from: string; after?: string };
  now: Date;
  maxHours?: number;
}): { from: string; after?: string } => {
  if (maxHours === undefined) {
    return cursor;
  }
  const earliest = now.getTime() - maxHours * HOUR_MS;
  return new Date(cursor.from).getTime() < earliest
    ? { from: new Date(earliest).toISOString() }
    : cursor;
};

export const getGetDreamingCursorStepDefinition = ({
  getAiIndexService,
  isDreamingAvailable,
  checkWritePrivilege,
}: DreamingCursorStepDependencies) =>
  createServerStepDefinition({
    ...getDreamingCursorStepCommonDefinition,
    handler: async (context) => {
      const request = context.contextManager.getFakeRequest();
      const { spaceId } = context.contextManager.getContext().workflow;
      await assertDreamingAvailable(isDreamingAvailable, spaceId);
      await assertKiWritePrivilege(checkWritePrivilege, request, spaceId);

      const { ai_index_id: aiIndexId, source, max_hours: maxHours } = context.input;
      try {
        const cursor = await getAiIndexService().getDreamingCursor(aiIndexId, spaceId, source);
        if (!cursor || Number.isNaN(new Date(cursor.from).getTime())) {
          const output: GetDreamingCursorOutput = { found: false };
          return { output };
        }
        const { from, after } = clampCursor({
          cursor: { from: cursor.from, ...(cursor.after !== undefined && { after: cursor.after }) },
          now: new Date(),
          maxHours,
        });
        const output: GetDreamingCursorOutput = {
          found: true,
          from,
          ...(after !== undefined && { after }),
        };
        return { output };
      } catch (error) {
        if (error instanceof AiIndexNotFoundError) {
          throw notFound(aiIndexId);
        }
        throw error;
      }
    },
  });

export const getSetDreamingCursorStepDefinition = ({
  getAiIndexService,
  isDreamingAvailable,
  checkWritePrivilege,
  logger,
}: DreamingCursorStepDependencies) =>
  createServerStepDefinition({
    ...setDreamingCursorStepCommonDefinition,
    handler: async (context) => {
      const request = context.contextManager.getFakeRequest();
      const { spaceId } = context.contextManager.getContext().workflow;
      await assertDreamingAvailable(isDreamingAvailable, spaceId);
      await assertKiWritePrivilege(checkWritePrivilege, request, spaceId);

      const { ai_index_id: aiIndexId, source, from, after } = context.input;
      if (Number.isNaN(new Date(from).getTime())) {
        throw new ExecutionError({
          type: 'ValidationError',
          message: `'${from}' is not a valid ISO 8601 time`,
        });
      }
      try {
        await getAiIndexService().setDreamingCursor(aiIndexId, spaceId, source, { from, after });
      } catch (error) {
        if (error instanceof AiIndexNotFoundError) {
          throw notFound(aiIndexId);
        }
        throw error;
      }
      logger.debug(`Saved the ${source} dreaming cursor of AI index '${aiIndexId}' at ${from}`);
      return { output: { from, ...(after !== undefined && after !== '' && { after }) } };
    },
  });
