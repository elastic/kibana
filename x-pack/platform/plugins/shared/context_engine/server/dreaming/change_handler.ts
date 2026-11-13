/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexChangeHandler } from '../ai_indices/changes';
import { shouldDream } from './schedule';
import type { DreamingScheduleService } from './schedule';

export const DREAMING_CHANGE_HANDLER_ID = 'dreaming_schedule';

/**
 * Reconciles the dreaming workflows of an AI index when its dreaming config or dest is saved.
 * While dreaming is unavailable, it only removes workflows.
 */
export const createDreamingChangeHandler = (
  getScheduleService: () => DreamingScheduleService,
  isDreamingAvailable: (spaceId: string) => Promise<boolean>
): AiIndexChangeHandler => ({
  id: DREAMING_CHANGE_HANDLER_ID,
  fields: ['dreaming', 'dest'],
  when: 'saved',
  onChange: async ({ aiIndexId, spaceId, request, current }) => {
    if (!current) {
      await getScheduleService().remove({ aiIndexId, spaceId, request });
      return;
    }
    if (shouldDream(current) && !(await isDreamingAvailable(spaceId))) {
      return;
    }
    await getScheduleService().reconcile({ aiIndex: current, spaceId, request });
  },
});
