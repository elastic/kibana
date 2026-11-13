/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvidenceRound } from './evidence/types';

// A BOM leading a part is an encoding artifact, not content, so it is dropped
// before the parts are joined (where it would no longer be leading).
const stringify = (value: unknown): string =>
  (typeof value === 'string' ? value : JSON.stringify(value)).replace(/^\uFEFF/, '');

/**
 * Text the agent itself wrote in a round: the final response plus tool-call
 * arguments. Tool results are excluded because they are data the agent merely
 * read, and the input message is excluded because it is the eval prompt.
 */
export const collectRoundText = (round: EvidenceRound): string => {
  const parts: string[] = [stringify(round.response.message)];
  for (const step of round.steps) {
    if (step.arguments != null) {
      parts.push(stringify(step.arguments));
    }
  }
  return parts.join('\n');
};
