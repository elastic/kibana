/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Crypto from 'crypto';
import Fs from 'fs';
import Path from 'path';
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
  /** Template family, for generated examples: lets a round report per-family deltas. */
  family?: string;
  /** How many probe attempts reproduced the gold result when the corpus was built. */
  difficulty?: string;
  /**
   * The question cannot be answered with a single ES|QL query, so the correct behaviour is to
   * say so. Scored separately: a confident wrong answer must not look like a success, and an
   * abstention must not be averaged into query quality.
   */
  abstention?: boolean;
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
  abstention,
}: {
  question: string;
  goldQuery: string;
  provenance: string;
  index?: string;
  abstention?: boolean;
}): HarnessExample => {
  const id = Crypto.createHash('sha256').update(question).digest('hex').slice(0, 12);
  return {
    id,
    seedId: id,
    question,
    goldQuery,
    provenance,
    index,
    split: assignSplit(id),
    ...(abstention ? { abstention: true } : {}),
  };
};

/**
 * Anchor dataset: the 31 security regression examples plus the 3 agent-builder ES|QL examples.
 *
 * Deliberately small and human-authored — it is the *reported* benchmark. A generated corpus
 * (see the plan in the tracking issue) is meant to be the search substrate later; until it
 * exists, every number out of this loop is a smoke test, not a promotion signal.
 */
/** Gold entries that are prose rather than a query mark questions the tool should decline. */
const isAbstention = (goldQuery: string): boolean =>
  !/^\s*(FROM|TS|PROMQL|ROW|SHOW)\b/i.test(goldQuery);

export const anchorExamples: HarnessExample[] = [
  ...securityRegressionExamples.map(({ input, output }) =>
    toExample({
      question: input.question,
      goldQuery: output.query,
      provenance: 'security-esql-generation-regression',
      abstention: isAbstention(output.query),
    })
  ),
  ...agentBuilderEsqlExamples.map(({ question, goldQuery, index }) =>
    toExample({ question, goldQuery, index, provenance: 'agent-builder-esql-suite' })
  ),
];

/** Path of the generated corpus; absent until `generate-corpus` has been run. */
export const GENERATED_CORPUS_PATH = Path.resolve(__dirname, 'generated_corpus.json');

interface GeneratedCorpusEntry {
  question: string;
  goldQuery: string;
  index: string;
  family?: string;
  difficulty?: string;
}

/**
 * Generated examples, loaded from disk when present.
 *
 * Reported separately from the anchor set on purpose: the anchor set is real user language with
 * human-verified gold and stays the benchmark of record, while the generated corpus is search
 * substrate. A gain that only shows up here is not a promotion signal.
 */
export const generatedExamples = (): HarnessExample[] => {
  if (!Fs.existsSync(GENERATED_CORPUS_PATH)) {
    return [];
  }
  const entries = JSON.parse(
    Fs.readFileSync(GENERATED_CORPUS_PATH, 'utf8')
  ) as GeneratedCorpusEntry[];
  return entries.map(({ question, goldQuery, index, family, difficulty }) => ({
    ...toExample({ question, goldQuery, index, provenance: 'generated-corpus' }),
    family,
    difficulty,
  }));
};

/** Human-written queries mined from Elasticsearch's own ES|QL spec suite. */
export const EXPERT_CORPUS_PATH = Path.resolve(__dirname, 'expert_corpus.json');

export const expertExamples = (): HarnessExample[] => {
  if (!Fs.existsSync(EXPERT_CORPUS_PATH)) {
    return [];
  }
  const entries = JSON.parse(Fs.readFileSync(EXPERT_CORPUS_PATH, 'utf8')) as GeneratedCorpusEntry[];
  return entries.map(({ question, goldQuery, index, family }) => ({
    ...toExample({ question, goldQuery, index, provenance: 'expert-authored' }),
    family,
  }));
};

export const allExamples = (): HarnessExample[] => [
  ...anchorExamples,
  ...expertExamples(),
  ...generatedExamples(),
];

export const examplesForSplit = (split: Split): HarnessExample[] =>
  allExamples().filter((example) => example.split === split);
