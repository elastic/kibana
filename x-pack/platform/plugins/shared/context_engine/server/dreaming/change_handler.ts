/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexChangeHandler } from '../ai_indices/changes';
import type { DreamingScheduleService } from './schedule';

export const DREAMING_CHANGE_HANDLER_ID = 'dreaming_schedule';

/**
 * Keeps the dreaming workflow of an AI index in line with its dreaming config. The workflow reads
 * memories from the AI index backing store, so a change to it reinstalls the workflow too.
 */
export const createDreamingChangeHandler = (
  getScheduleService: () => DreamingScheduleService
): AiIndexChangeHandler => ({
  id: DREAMING_CHANGE_HANDLER_ID,
  fields: ['dreaming', 'dest'],
  // Saving the config unchanged still reconciles: it retries an install that failed, and
  // enabling re-mints the API key the scheduled runs use, so they follow whoever last saved it.
  // Reinstalling unchanged values leaves the workflow as it is.
  when: 'saved',
  onChange: async ({ aiIndexId, spaceId, request, current }) => {
    if (!current) {
      await getScheduleService().remove({ aiIndexId, spaceId, request });
      return;
    }
    await getScheduleService().reconcile({ aiIndex: current, spaceId, request });
  },
});
