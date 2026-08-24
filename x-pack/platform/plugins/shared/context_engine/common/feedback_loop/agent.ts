/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTEXT_ENGINE_FEEDBACK_AGENT_ID } from '../constants';

/**
 * The agent that runs an AI index's analysis: the one chosen on the index, or the built-in
 * Context Engine Feedback Loop agent. Shared by the server (which resolves it for a run) and the
 * browser (which resolves it for the interactive hand-off) so both always pick the same agent.
 */
export const resolveFeedbackAgentId = (feedbackAgentId?: string): string => {
  const trimmed = feedbackAgentId?.trim();
  return trimmed ? trimmed : CONTEXT_ENGINE_FEEDBACK_AGENT_ID;
};

/** Whether an AI index relies on the built-in default rather than an explicitly chosen agent. */
export const isDefaultFeedbackAgent = (feedbackAgentId?: string): boolean =>
  resolveFeedbackAgentId(feedbackAgentId) === CONTEXT_ENGINE_FEEDBACK_AGENT_ID;
