/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Crypto from 'crypto';
import { securityRegressionExamples } from './security_regression';
import { agentBuilderEsqlExamples } from './agent_builder_esql';

export type Split = 'search' | 'gate' | 'sealed';

export interface HarnessExample {
  /** Stable id derived from the question text, so splits survive dataset reordering. */
  id: string;
  /** Seed the example (and later its permutations) belongs to. Statistics cluster on this. */
  seedId: string;
  question: string;
  goldQuery: string;
  index?: string;
  provenance: string;
  split: Split;
}

const hashToUnitInterval = (value: string): number => {
  const digest = Crypto.createHash('sha256').update(value).digest();
  return digest.readUInt32BE(0) / 0xffffffff;
};

/**
 * Deterministic seed-level split.
 *
 * 40% search / 30% gate / 30% sealed, assigned from a hash of the seed id, so adding examples
 * never reshuffles the existing ones and the sealed split cannot drift into the search split.
 */
export const assignSplit = (seedId: string): Split => {
  const position = hashToUnitInterval(`split:${seedId}`);
  if (position < 0.4) return 'search';
  if (position < 0.7) return 'gate';
  return 'sealed';
};

const toExample = ({
  question,
  goldQuery,
  provenance,
  index,
}: {
  question: string;
  goldQuery: string;
  provenance: string;
  index?: string;
}): HarnessExample => {
  const id = Crypto.createHash('sha256').update(question).digest('hex').slice(0, 12);
  return { id, seedId: id, question, goldQuery, provenance, index, split: assignSplit(id) };
};

/**
 * Anchor dataset: the 31 security regression examples plus the 3 agent-builder ES|QL examples.
 *
 * Deliberately small and human-authored — it is the *reported* benchmark. A generated corpus
 * (see the plan in the tracking issue) is meant to be the search substrate later; until it
 * exists, every number out of this loop is a smoke test, not a promotion signal.
 */
export const anchorExamples: HarnessExample[] = [
  ...securityRegressionExamples.map(({ input, output }) =>
    toExample({
      question: input.question,
      goldQuery: output.query,
      provenance: 'security-esql-generation-regression',
    })
  ),
  ...agentBuilderEsqlExamples.map(({ question, goldQuery, index }) =>
    toExample({ question, goldQuery, index, provenance: 'agent-builder-esql-suite' })
  ),
];

export const examplesForSplit = (split: Split): HarnessExample[] =>
  anchorExamples.filter((example) => example.split === split);
