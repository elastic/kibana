/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import type { Comparison, Tally } from '../compare';
import { compareMemories, KINDS, scoresOfTally, sumTallies } from '../compare';
import { runDirOf } from '../config';
import type { StageContext } from '../context';
import { readJson, writeJson } from '../download';
import { ALL_SAMPLES, parseReferenceMemories, referenceDirOf, referenceFileOf } from '../reference';
import { percent } from '../report';
import type { KiDump } from '../types';
import { dumpedSamplesOf, kiDumpFileOf, sampleDirOf } from './run';

const LISTED_MISSES = 200;
const LISTED_EXTRAS = 100;

export interface MemoryComparison {
  runId: string;
  aiIndexId: string;
  references: string;
  comparedAt: string;
  factThreshold: number;
  entityThreshold: number;
  byKind: Record<string, Tally>;
  byType: Record<string, Tally>;
  /** Samples whose KIs were dumped but that have no reference memories. */
  withoutReference: string[];
  comparisons: Comparison[];
}

export const comparisonFileOf = (dir: string): string => path.join(dir, 'comparison.json');

const row = (name: string, tally: Tally): string => {
  const { recall, precision, f1 } = scoresOfTally(tally);
  return `| ${name} | ${tally.required} | ${tally.expected - tally.required} | ${
    tally.produced
  } | ${tally.matchedRequired} | ${percent(recall)} | ${percent(precision)} | ${percent(f1)} | ${
    tally.matched === 0 ? '-' : percent(tally.sameType / tally.matched)
  } |`;
};

const HEADER = [
  '| | Required | Optional | Produced | Matched (required) | Recall | Precision | F1 | Same type |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
];

export const comparisonMarkdown = (comparison: MemoryComparison): string => {
  const samples = comparison.comparisons.filter(({ sample }) => sample);
  const misses = comparison.comparisons.flatMap(({ sample, matches }) =>
    matches
      .filter(({ kiId, optional }) => !kiId && !optional)
      .map((match) => ({ sample, ...match }))
  );
  const extras = comparison.comparisons.flatMap(({ sample, extras: kis }) =>
    kis.map((extra) => ({ sample, ...extra }))
  );
  const inSample = (sample?: string) => (sample ? ` (${sample})` : '');
  return [
    `# Memory comparison: ${comparison.aiIndexId}, run ${comparison.runId}`,
    '',
    `The KIs dreaming wrote, matched one to one by code against the reference memories in \`${comparison.references}\`: entities by name (at least ${comparison.entityThreshold}), facts by keywords and wording (at least ${comparison.factThreshold}), relationships by type and matched ends. Recall is of the required reference memories; precision is of the KIs, each matched or not; same type is the share of matches whose KI has the reference's type.`,
    '',
    '## By kind',
    '',
    ...HEADER,
    ...KINDS.map((kind) => row(kind, comparison.byKind[kind])),
    '',
    '## By type',
    '',
    ...HEADER,
    ...Object.entries(comparison.byType).map(([type, tally]) => row(type, tally)),
    '',
    ...(samples.length > 1
      ? [
          '## By sample',
          '',
          `| Sample | ${KINDS.map((kind) => `${kind} recall | ${kind} precision`).join(' | ')} |`,
          `| --- | ${KINDS.map(() => '--- | ---').join(' | ')} |`,
          ...samples.map(
            ({ sample, byKind }) =>
              `| ${sample} | ${KINDS.map((kind) => {
                const { recall, precision } = scoresOfTally(byKind[kind]);
                return `${percent(recall)} | ${percent(precision)}`;
              }).join(' | ')} |`
          ),
          '',
        ]
      : []),
    ...(comparison.withoutReference.length > 0
      ? [`Samples without reference memories: ${comparison.withoutReference.join(', ')}.`, '']
      : []),
    `## Missed (${misses.length} required reference memories)`,
    '',
    ...misses
      .slice(0, LISTED_MISSES)
      .map(
        ({ sample, kind, type, referenceId, reference }) =>
          `- ${kind}.${type} \`${referenceId}\`${inSample(sample)}: ${reference}`
      ),
    ...(misses.length > LISTED_MISSES ? [`- … and ${misses.length - LISTED_MISSES} more`] : []),
    '',
    `## Extra KIs (${extras.length} that match no reference memory)`,
    '',
    ...extras
      .slice(0, LISTED_EXTRAS)
      .map(
        ({ sample, kind, type, kiId, ki }) =>
          `- ${kind}.${type} \`${kiId}\`${inSample(sample)}: ${ki}`
      ),
    ...(extras.length > LISTED_EXTRAS ? [`- … and ${extras.length - LISTED_EXTRAS} more`] : []),
    '',
  ].join('\n');
};

/**
 * Matches the KIs a run dumped against reference memories, without an LLM: per sample when the
 * samples ran one at a time, else the run's KIs against one reference.
 */
export const runCompare = async (context: StageContext): Promise<void> => {
  const { config, log, runId } = context;
  const options = {
    factThreshold: config.compare.fact_threshold,
    entityThreshold: config.compare.entity_threshold,
  };
  for (const aiIndex of config.ai_indices.filter(({ id }) => context.aiIndexIds.includes(id))) {
    const runDir = runDirOf(config, runId, aiIndex.id);
    const references = referenceDirOf(config, aiIndex);
    const samples = dumpedSamplesOf(runDir);
    const units = samples.length > 0 ? samples : [ALL_SAMPLES];
    if (samples.length === 0 && !fs.existsSync(kiDumpFileOf(runDir))) {
      throw new Error(`No KI dump at ${kiDumpFileOf(runDir)}: run the run stage first`);
    }

    const comparisons: Comparison[] = [];
    const withoutReference: string[] = [];
    for (const unit of units) {
      const file = referenceFileOf(references, unit);
      if (!fs.existsSync(file)) {
        withoutReference.push(unit);
        continue;
      }
      const reference = parseReferenceMemories(readJson<unknown>(file), file);
      const dumpDir = unit === ALL_SAMPLES ? runDir : sampleDirOf(runDir, unit);
      const { kis } = readJson<KiDump>(kiDumpFileOf(dumpDir));
      comparisons.push(
        compareMemories(reference, kis, options, unit === ALL_SAMPLES ? undefined : unit)
      );
    }
    if (comparisons.length === 0) {
      throw new Error(
        `${aiIndex.id}: no reference memories in ${references} for ${
          units.length === 1 ? units[0] : `any of ${units.length} samples`
        }: write them with the prompts of the reference stage`
      );
    }
    if (withoutReference.length > 0) {
      log.warning(
        `${aiIndex.id}: ${withoutReference.length} of ${
          units.length
        } samples have no reference memories: ${withoutReference.slice(0, 5).join(', ')}${
          withoutReference.length > 5 ? ', …' : ''
        }`
      );
    }

    const comparison: MemoryComparison = {
      runId,
      aiIndexId: aiIndex.id,
      references: path.relative(process.cwd(), references),
      comparedAt: new Date().toISOString(),
      ...options,
      byKind: sumTallies(comparisons.map(({ byKind }) => byKind)),
      byType: sumTallies(comparisons.map(({ byType }) => byType)),
      withoutReference,
      comparisons,
    };
    writeJson(comparisonFileOf(runDir), comparison);
    const summaryFile = path.join(runDir, 'comparison.md');
    fs.writeFileSync(summaryFile, comparisonMarkdown(comparison));
    log.success(
      `${aiIndex.id}: compared ${comparisons.length} ${
        comparisons.length === 1 ? 'reference' : 'references'
      } → ${path.relative(process.cwd(), summaryFile)}`
    );
    for (const kind of KINDS) {
      const tally = comparison.byKind[kind];
      const { recall, precision, f1 } = scoresOfTally(tally);
      log.info(
        `  ${kind}: recall ${percent(recall)} (${tally.matchedRequired} of ${
          tally.required
        }), precision ${percent(precision)} (${tally.produced} KIs), F1 ${percent(f1)}`
      );
    }
  }
};
