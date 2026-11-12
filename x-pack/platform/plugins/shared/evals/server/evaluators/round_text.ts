/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with, at
 * your election, the Elastic License 2.0, the GNU Affero General Public License
 * v3.0 only, or the Server Side Public License v 1".
 */

import type { EvidenceRound } from './evidence/types';

/**
 * Collects the agent-authored textual surface of a round: the response and
 * every tool-call argument/result. The input message is deliberately
 * excluded — it is the evaluation prompt, not produced content.
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
