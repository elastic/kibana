/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import { isToolCallStep } from '@kbn/agent-builder-common';

/**
 * Adds a step to a turn. A resume re-reports the tool calls it resolved, so a call already in the
 * turn is replaced instead of repeated: the position comes from the execution that paused, the
 * results from the resume.
 */
export const addTurnStep = (steps: ConversationRoundStep[], step: ConversationRoundStep): void => {
  if (!isToolCallStep(step)) {
    steps.push(step);
    return;
  }
  const alreadyInTurn = steps.findIndex(
    (candidate) => isToolCallStep(candidate) && candidate.tool_call_id === step.tool_call_id
  );
  if (alreadyInTurn === -1) {
    steps.push(step);
    return;
  }
  steps[alreadyInTurn] = step;
};
