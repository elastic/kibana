/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvidenceRound } from './evidence/types';

/**
 * Agent-produced text of a round (response plus tool-call arguments/results);
 * the input message is excluded because it is the eval prompt, not output.
 */
export const collectRoundText = (round: EvidenceRound): string => {
  const parts: string[] = [round.response.message];

  for (const step of round.steps) {
    if (step.arguments != null) {
      parts.push(
        typeof step.arguments === 'string' ? step.arguments : JSON.stringify(step.arguments)
      );
    }
    if (step.result != null) {
      parts.push(typeof step.result === 'string' ? step.result : JSON.stringify(step.result));
    }
  }

  return parts.join('\n');
};
