/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import { destOf, runDirOf } from '../config';
import type { StageContext } from '../context';
import { readJson } from '../download';
import { runTargetsFileOf } from '../targets';
import type { KiDump } from '../types';
import { dumpedSamplesOf, kiDumpFileOf, restoreDreamedKis, sampleDirOf } from './run';

/** The KI dumps of one AI index found at a path a colleague shared. */
export interface SharedDump {
  /** The AI index the KIs were dumped from. */
  aiIndexId: string;
  runId: string;
  /** The folder to copy: one AI index's folder of a run, or the folder of a lone `kis.json`. */
  dir: string;
  /** A lone `kis.json` outside a run's folder. */
  file?: string;
  samples: string[];
}

const describeDump = (dir: string, file?: string): SharedDump | undefined => {
  const samples = file ? [] : dumpedSamplesOf(dir);
  const dumpFile =
    file ?? (samples.length > 0 ? kiDumpFileOf(sampleDirOf(dir, samples[0])) : kiDumpFileOf(dir));
  if (!fs.existsSync(dumpFile)) {
    return undefined;
  }
  const { aiIndexId, runId } = readJson<KiDump>(dumpFile);
  return { aiIndexId, runId, dir, ...(file && { file }), samples };
};

/**
 * The dumps at a shared path: a `kis.json`, one AI index's folder of a run (with `kis.json` or
 * `samples/`), or a run's folder with a folder per AI index.
 */
export const findSharedDumps = (from: string): SharedDump[] => {
  if (!fs.existsSync(from)) {
    throw new Error(`Nothing to load at ${from}`);
  }
  if (fs.statSync(from).isFile()) {
    const dump = describeDump(path.dirname(from), from);
    return dump ? [dump] : [];
  }
  const own = describeDump(from);
  if (own) {
    return [own];
  }
  return fs
    .readdirSync(from)
    .map((name) => path.join(from, name))
    .filter((dir) => fs.statSync(dir).isDirectory())
    .flatMap((dir) => describeDump(dir) ?? []);
};

/** The run id a shared path was dumped by, so the copied run keeps its name. */
export const runIdOfShared = (from: string): string | undefined => findSharedDumps(from)[0]?.runId;

const copyDump = (dump: SharedDump, runDir: string) => {
  fs.mkdirSync(runDir, { recursive: true });
  if (dump.file) {
    fs.copyFileSync(dump.file, kiDumpFileOf(runDir));
    return;
  }
  if (path.resolve(dump.dir) !== path.resolve(runDir)) {
    fs.cpSync(dump.dir, runDir, { recursive: true });
  }
};

/**
 * Loads KIs someone else dreamed: copies their dumps into a run of this config, so the evaluate
 * and ask stages work on them, and writes them to the AI index. Samples that ran one at a time are
 * written by the ask stage, each before its questions; `--samples` with one sample writes it now.
 */
export const runLoad = async (context: StageContext): Promise<void> => {
  const { config, esClient, log, runId, loadFrom } = context;
  if (!loadFrom) {
    throw new Error('The load stage needs --from: a run folder, an AI index folder or a kis.json');
  }
  const dumps = findSharedDumps(loadFrom);
  if (dumps.length === 0) {
    throw new Error(`No KI dumps at ${loadFrom}`);
  }
  const selected = config.ai_indices.filter(({ id }) => context.aiIndexIds.includes(id));
  for (const dump of dumps) {
    // A single dump loads into the single AI index the run works on, whatever its name was.
    const aiIndex =
      dumps.length === 1 && selected.length === 1
        ? selected[0]
        : selected.find(({ id }) => id === dump.aiIndexId);
    if (!aiIndex) {
      log.warning(
        `Skipping the KIs of AI index '${dump.aiIndexId}': this run works on ${selected
          .map(({ id }) => id)
          .join(', ')}`
      );
      continue;
    }
    const runDir = runDirOf(config, runId, aiIndex.id);
    copyDump(dump, runDir);
    const targets = fs.existsSync(runTargetsFileOf(runDir))
      ? 'with its targets'
      : 'without targets';
    log.success(
      `Copied the KIs of '${dump.aiIndexId}' (run ${dump.runId}${
        dump.samples.length > 0 ? `, ${dump.samples.length} samples` : ''
      }) ${targets} to ${path.relative(process.cwd(), runDir)}`
    );

    const dest = destOf(aiIndex.id);
    if (dump.samples.length === 0) {
      const { kis } = readJson<KiDump>(kiDumpFileOf(runDir));
      await restoreDreamedKis(esClient, dest, kis, config.space);
      log.success(`Wrote ${kis.length} KIs to ${dest}`);
      continue;
    }
    const wanted = aiIndex.datasets.flatMap((dataset) => config.datasets[dataset].samples);
    if (wanted.length === 1 && dump.samples.includes(wanted[0])) {
      const { kis } = readJson<KiDump>(kiDumpFileOf(sampleDirOf(runDir, wanted[0])));
      await restoreDreamedKis(esClient, dest, kis, config.space);
      log.success(`Wrote the ${kis.length} KIs of sample ${wanted[0]} to ${dest}`);
    } else {
      log.info(
        `The samples ran one at a time: the ask stage writes each sample's KIs to ${dest} before its questions. To write one now, run the load stage with --samples <sample>.`
      );
    }
  }
};
