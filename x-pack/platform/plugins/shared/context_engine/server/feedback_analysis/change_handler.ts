/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexChangeHandler } from '../ai_indices/changes';
import type { FeedbackAnalysisScheduleService } from './schedule';

export const FEEDBACK_ANALYSIS_CHANGE_HANDLER_ID = 'feedback_analysis_schedule';

/** Keeps the feedback analysis schedule of a saved AI index in line with its configuration. */
export const createFeedbackAnalysisChangeHandler = (
  getScheduleService: () => FeedbackAnalysisScheduleService
): AiIndexChangeHandler => ({
  id: FEEDBACK_ANALYSIS_CHANGE_HANDLER_ID,
  fields: ['feedback_analysis'],
  // Saving the configuration unchanged still reconciles: enabling re-mints the API key the
  // scheduled runs use, so the schedule follows whoever last saved it.
  when: 'saved',
  onChange: async ({ aiIndexId, spaceId, request, current }) => {
    if (!current) {
      await getScheduleService().remove({ aiIndexId, spaceId });
      return;
    }
    await getScheduleService().reconcile({
      aiIndexId,
      spaceId,
      ...(current.feedback_analysis ? { feedbackAnalysis: current.feedback_analysis } : {}),
      request,
    });
  },
});
