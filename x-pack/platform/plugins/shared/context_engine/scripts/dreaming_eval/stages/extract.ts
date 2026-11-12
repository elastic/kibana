/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import type { DatasetName } from '../config';
import { datasetDirOf } from '../config';
import type { StageContext } from '../context';
import { downloadFile, readJson, streamRemoteLines, writeJson } from '../download';
import type { LongMemEvalRecord } from '../datasets/longmemeval_s';
import * as longMemEvalS from '../datasets/longmemeval_s';
import type { LmeV2Haystack, LmeV2Question, LmeV2Trajectory } from '../datasets/longmemeval_v2';
import * as longMemEvalV2 from '../datasets/longmemeval_v2';
import type { ExtractedDataset } from '../types';

export const extractedFileOf = (dir: string): string => path.join(dir, 'extracted.json');
export const generatedTargetsFileOf = (dir: string): string => path.join(dir, 'targets.json');

const extractLongMemEvalS = async (context: StageContext): Promise<ExtractedDataset> => {
  const { config, log, forceDownload } = context;
  const options = config.datasets.longmemeval_s;
  const dir = datasetDirOf(config, 'longmemeval_s');
  const file = await downloadFile({
    url: options.url,
    dest: path.join(dir, 'longmemeval_s_cleaned.json'),
    force: forceDownload,
    log,
  });
  const records = readJson<LongMemEvalRecord[]>(file);
  const questions = longMemEvalS.selectQuestions(records, options);
  const { conversations, sampleConversations } = longMemEvalS.selectConversations(
    questions,
    options
  );
  return {
    dataset: longMemEvalS.LONGMEMEVAL_S_DATASET,
    samples: questions.map(({ question_id: id }) => id),
    sampleConversations,
    agent: options.agent,
    conversations,
    targets: longMemEvalS.targetsOf(questions),
  };
};

/** Reads the selected trajectories, streaming the large trajectories file once per selection. */
const readTrajectories = async (
  context: StageContext,
  url: string,
  ids: string[],
  cacheFile: string
): Promise<LmeV2Trajectory[]> => {
  const wanted = new Set(ids);
  const cached = fs.existsSync(cacheFile) ? readJson<LmeV2Trajectory[]>(cacheFile) : [];
  if (!context.forceDownload && ids.every((id) => cached.some((t) => t.id === id))) {
    context.log.debug(`Using selected trajectories in ${cacheFile}`);
    return ids.flatMap((id) => cached.find((t) => t.id === id) ?? []);
  }
  context.log.info(`Streaming ${url} for ${wanted.size} trajectories (1.2 GB, kept only in part)`);
  const found = new Map<string, LmeV2Trajectory>();
  for await (const line of streamRemoteLines(url)) {
    const id = longMemEvalV2.trajectoryIdOfLine(line);
    if (id !== undefined && !wanted.has(id)) {
      continue;
    }
    const trajectory = JSON.parse(line) as LmeV2Trajectory;
    if (wanted.has(trajectory.id)) {
      found.set(trajectory.id, trajectory);
      if (found.size === wanted.size) {
        break;
      }
    }
  }
  const missing = ids.filter((id) => !found.has(id));
  if (missing.length > 0) {
    throw new Error(`trajectories.jsonl has no trajectories ${missing.slice(0, 5).join(', ')}…`);
  }
  const selected = ids.flatMap((id) => found.get(id) ?? []);
  writeJson(cacheFile, selected);
  return selected;
};

const extractLongMemEvalV2 = async (context: StageContext): Promise<ExtractedDataset> => {
  const { config, log, forceDownload } = context;
  const options = config.datasets.longmemeval_v2_enterprise;
  const dir = datasetDirOf(config, 'longmemeval_v2_enterprise');
  const download = (name: string) =>
    downloadFile({
      url: `${options.base_url}/${name}`,
      dest: path.join(dir, name),
      force: forceDownload,
      log,
    });
  const questions = fs
    .readFileSync(await download('questions.jsonl'), 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as LmeV2Question);
  const haystack = readJson<LmeV2Haystack>(
    await download(`haystacks/lme_v2_${options.haystack}.json`)
  );
  const selectedQuestions = longMemEvalV2.selectQuestions(questions, options);
  const ids = longMemEvalV2.selectTrajectoryIds(selectedQuestions, haystack, options);
  const haystackSize = longMemEvalV2.selectTrajectoryIds(selectedQuestions, haystack, {
    ...options,
    max_trajectories: undefined,
  }).length;
  if (ids.length < haystackSize) {
    log.warning(
      `Importing ${ids.length} of the ${haystackSize} trajectories the samples are asked over (max_trajectories): some targets may not be learnable.`
    );
  }
  const trajectories = await readTrajectories(
    context,
    `${options.base_url}/trajectories.jsonl`,
    ids,
    path.join(dir, 'trajectories.selected.json')
  );
  return {
    dataset: longMemEvalV2.LONGMEMEVAL_V2_ENTERPRISE_DATASET,
    samples: selectedQuestions.map(({ id }) => id),
    sampleConversations: Object.fromEntries(
      selectedQuestions.map((question) => [
        question.id,
        (haystack[question.id] ?? []).filter((id) => ids.includes(id)),
      ])
    ),
    agent: options.agent,
    conversations: trajectories.map((trajectory, order) =>
      longMemEvalV2.trajectoryToConversation(trajectory, order, options)
    ),
    targets: longMemEvalV2.targetsOf(selectedQuestions),
  };
};

const EXTRACTORS: Record<DatasetName, (context: StageContext) => Promise<ExtractedDataset>> = {
  longmemeval_s: extractLongMemEvalS,
  longmemeval_v2_enterprise: extractLongMemEvalV2,
};

/** The datasets the selected AI indices dream over. */
export const datasetsOf = (context: StageContext): DatasetName[] => [
  ...new Set(
    context.config.ai_indices
      .filter(({ id }) => context.aiIndexIds.includes(id))
      .flatMap(({ datasets }) => datasets)
  ),
];

export const runExtract = async (context: StageContext): Promise<void> => {
  for (const dataset of datasetsOf(context)) {
    const extracted = await EXTRACTORS[dataset](context);
    const dir = datasetDirOf(context.config, dataset);
    writeJson(extractedFileOf(dir), extracted);
    writeJson(generatedTargetsFileOf(dir), extracted.targets);
    const rounds = extracted.conversations.reduce((sum, { rounds: r }) => sum + r.length, 0);
    const { samples } = extracted;
    context.log.success(
      `${dataset}: ${samples.length} samples (${samples.slice(0, 5).join(', ')}${
        samples.length > 5 ? ', …' : ''
      }), ${extracted.conversations.length} conversations, ${rounds} rounds, ${
        extracted.targets.length
      } targets → ${path.relative(process.cwd(), dir)}`
    );
  }
};
