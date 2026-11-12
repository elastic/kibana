/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvidenceRound } from './evidence/types';

const stringify = (value: unknown): string =>
  typeof value === 'string' ? value : JSON.stringify(value);

const collectParts = (round: EvidenceRound, includeToolResults: boolean): string => {
  const parts: string[] = [round.response.message];

  for (const step of round.steps) {
    if (step.arguments != null) {
      parts.push(stringify(step.arguments));
    }
    if (includeToolResults && step.result != null) {
      parts.push(stringify(step.result));
    }
  }

  return parts.join('\n');
};

/**
 * Text the agent itself wrote in a round: the final response plus tool-call
 * arguments. Tool results are excluded because they are data the agent merely
 * read, and the input message is excluded because it is the eval prompt.
 */
export const collectRoundText = (round: EvidenceRound): string => collectParts(round, false);

/** Like `collectRoundText`, but also includes tool-call results. */
export const collectRoundTextWithToolResults = (round: EvidenceRound): string =>
  collectParts(round, true);
