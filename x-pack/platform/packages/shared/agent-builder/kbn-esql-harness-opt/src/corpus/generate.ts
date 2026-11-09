/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Crypto from 'crypto';
import Fs from 'fs';
import { spawn } from 'child_process';
import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { describeIndex } from './schema';
import type { IndexSchema } from './schema';
import { instantiateTemplates } from './templates';
import type { CandidateQuery } from './templates';

export interface GeneratedExample {
  question: string;
  goldQuery: string;
  index: string;
  family: string;
  /** Rows the gold query returned at generation time, as a stable fingerprint. */
  rowCount: number;
  /** Set by the difficulty probe: how many independent attempts reproduced the gold result. */
  solvedBy?: number;
  attempts?: number;
  difficulty?: 'trivial' | 'easy' | 'hard' | 'unsolved';
}

const FAMILY_CAP = 6;
const PER_INDEX_CAP = 110;

/**
 * Families the first corpus proved the harness already solves on the first attempt.
 *
 * They stay in the pool as regression ballast but get a much smaller share: a corpus made of
 * single-stage filters and counts cannot show an improvement or a regression.
 */
const SATURATED_FAMILIES = new Set([
  'filter-keep',
  'count-filtered',
  'distinct-count',
  'single-stat',
  'top-n',
  'range-filter',
]);
const SATURATED_FAMILY_CAP = 2;

const isDegenerate = (values: unknown[][]): boolean => {
  if (values.length === 0) return true;
  const flat = values.flat();
  if (flat.every((value) => value === null)) return true;
  // A single row of a single value is usually a count that any query shape reproduces.
  if (values.length === 1 && values[0].length === 1) return false;
  const serialized = values.map((row) => JSON.stringify(row));
  return new Set(serialized).size === 1 && values.length > 1;
};

/** L2: instantiate templates, execute them, and keep the ones that return usable results. */
export const synthesizeQueries = async ({
  esClient,
  indices,
  log,
}: {
  esClient: EsClient;
  indices: string[];
  log: ToolingLog;
}): Promise<Array<CandidateQuery & { rowCount: number; fingerprint: string }>> => {
  const kept: Array<CandidateQuery & { rowCount: number; fingerprint: string }> = [];

  for (const index of indices) {
    let schema: IndexSchema;
    try {
      schema = await describeIndex({ esClient, index });
    } catch (e) {
      log.warning(`[corpus] skipping ${index}: ${(e as Error).message}`);
      continue;
    }

    const candidates = instantiateTemplates(schema);
    const perFamily = new Map<string, number>();
    const seenFingerprints = new Set<string>();
    let keptForIndex = 0;

    for (const candidate of candidates) {
      if (keptForIndex >= PER_INDEX_CAP) break;
      const cap = SATURATED_FAMILIES.has(candidate.family) ? SATURATED_FAMILY_CAP : FAMILY_CAP;
      if ((perFamily.get(candidate.family) ?? 0) >= cap) continue;

      try {
        const result = (await esClient.esql.query({ query: candidate.query })) as {
          values?: unknown[][];
        };
        const values = result.values ?? [];
        if (isDegenerate(values)) continue;

        const fingerprint = Crypto.createHash('sha256')
          .update(JSON.stringify(values))
          .digest('hex')
          .slice(0, 16);
        // Two templates that return the same rows teach the harness the same lesson twice.
        if (seenFingerprints.has(fingerprint)) continue;
        seenFingerprints.add(fingerprint);

        kept.push({ ...candidate, rowCount: values.length, fingerprint });
        perFamily.set(candidate.family, (perFamily.get(candidate.family) ?? 0) + 1);
        keptForIndex++;
      } catch (e) {
        // a template that does not apply to this mapping is simply not part of the corpus
      }
    }

    log.info(`[corpus] ${index}: kept ${keptForIndex} executed queries`);
  }

  return kept;
};

const runAgent = (
  command: string,
  args: string[],
  input: string,
  timeoutMs: number
): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`agent timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdin.write(input);
    child.stdin.end();
    child.stdout.on('data', (chunk) => (stdout += String(chunk)));
    child.stderr.on('data', (chunk) => (stderr += String(chunk)));
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`agent exited ${code}: ${stderr.slice(-500)}`));
      }
      resolve(stdout);
    });
  });

const extractJson = (text: string): unknown => {
  const fenced = text.match(/```(?:json)?\n([\s\S]*?)```/);
  const payload = fenced ? fenced[1] : text.slice(text.indexOf('['), text.lastIndexOf(']') + 1);
  return JSON.parse(payload);
};

/**
 * L3: ask a model from a different family than the optimized tier to write the question a user
 * would have asked to get this result.
 *
 * Questions are written from `{query, columns, row count}`, never the other way around, so the
 * gold stays an executed fact. The generator is told not to name ES|QL syntax: a question that
 * spells out the commands makes the benchmark easy in a way production never is.
 */
export const backTranslate = async ({
  queries,
  command,
  commandArgs = [],
  log,
  batchSize = 10,
  timeoutMs = 600_000,
}: {
  queries: Array<CandidateQuery & { rowCount: number; intent?: string }>;
  command: string;
  commandArgs?: string[];
  log: ToolingLog;
  batchSize?: number;
  timeoutMs?: number;
}): Promise<GeneratedExample[]> => {
  const examples: GeneratedExample[] = [];

  for (let offset = 0; offset < queries.length; offset += batchSize) {
    const batch = queries.slice(offset, offset + batchSize);
    const prompt = `For each ES|QL query below, write the single natural-language question a data
analyst would have asked to get that result.

Rules:
- Describe the result wanted, never the computation: no ES|QL command names and no function
  names (no STATS, BUCKET, DISSECT, AVG, COUNT_DISTINCT …).
- The question must pin down the same result set as the query, in plain words: which fields to
  return, how many rows, the sort order, the grouping, the time granularity, and every filter
  value or threshold. "The 10 busiest hosts, most events first" is good; "busy hosts" is not.
- Never write the index name. Refer to the data the way a user would ("the web logs", "the
  employee records") — the index is supplied separately, and a question that spells it out
  teaches the harness to memorise fixture names.
- One or two sentences, natural phrasing, no preamble.

Reply with a JSON array of {"i": <index in the list>, "question": "..."} and nothing else.

${batch.map((item, index) => `${index}. index: ${item.index}\n${item.query}`).join('\n\n')}`;

    try {
      const output = await runAgent(command, commandArgs, prompt, timeoutMs);
      const parsed = extractJson(output) as Array<{ i: number; question: string }>;
      for (const { i, question } of parsed) {
        const source = batch[i];
        if (!source || typeof question !== 'string' || question.trim().length < 10) continue;
        examples.push({
          question: question.trim(),
          goldQuery: source.query,
          index: source.index,
          family: source.family,
          rowCount: source.rowCount,
        });
      }
      log.info(`[corpus] back-translated ${examples.length}/${queries.length} queries`);
    } catch (e) {
      log.warning(`[corpus] back-translation batch failed: ${(e as Error).message}`);
    }
  }

  return examples;
};

/**
 * Saturation control.
 *
 * A benchmark where the incumbent already scores ~1.0 cannot show an improvement, and one where
 * it scores ~0 cannot show a regression; both waste the round. The probe runs each generated
 * question through the current harness `attempts` times and keeps a mix weighted towards the
 * band where attempts disagree — the same "flipping cases" signal the review calls the strongest
 * diagnosis evidence.
 */
export const labelDifficulty = ({
  example,
  solvedBy,
  attempts,
}: {
  example: GeneratedExample;
  solvedBy: number;
  attempts: number;
}): GeneratedExample => {
  const ratio = attempts === 0 ? 0 : solvedBy / attempts;
  const difficulty =
    ratio === 1 ? 'trivial' : ratio >= 0.5 ? 'easy' : ratio > 0 ? 'hard' : 'unsolved';
  return { ...example, solvedBy, attempts, difficulty };
};

/**
 * Keep the corpus away from both ceilings: at most `trivialShare` of the examples may be ones the
 * incumbent always gets right, and unsolved examples are capped too (an example no attempt ever
 * solves is usually a broken question, not a hard one).
 */
export const balanceCorpus = ({
  examples,
  trivialShare = 0.3,
}: {
  examples: GeneratedExample[];
  trivialShare?: number;
}): GeneratedExample[] => {
  // Flipping cases (solved on some attempts, not others) are the strongest diagnosis signal, so
  // they are all kept. Never-solved examples are kept too — they are where a harness fix has
  // room — but capped, because a question nothing ever solves is as often broken as it is hard.
  const flipping = examples.filter(
    (example) => example.difficulty === 'easy' || example.difficulty === 'hard'
  );
  const unsolved = examples.filter((example) => example.difficulty === 'unsolved');
  const keptUnsolved = unsolved.slice(0, Math.max(flipping.length * 2, 20));
  const discriminating = [...flipping, ...keptUnsolved];

  // Trivial examples are regression ballast: enough to notice a config that breaks the easy
  // cases, not so many that the benchmark sits at the ceiling.
  const trivialBudget = Math.round(
    (discriminating.length * trivialShare) / Math.max(1 - trivialShare, 0.1)
  );

  return [
    ...discriminating,
    ...examples.filter((example) => example.difficulty === 'trivial').slice(0, trivialBudget),
  ];
};

/** Full labelled set, kept next to the corpus so the balance decisions can be audited. */
export const writeLabelled = (path: string, examples: GeneratedExample[]): void => {
  Fs.writeFileSync(path, `${JSON.stringify(examples, null, 2)}\n`);
};

export const writeCorpus = (path: string, examples: GeneratedExample[]): void => {
  Fs.writeFileSync(path, `${JSON.stringify(examples, null, 2)}\n`);
};
