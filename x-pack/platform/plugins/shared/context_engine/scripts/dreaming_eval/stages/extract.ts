/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import type { DatasetName, LongMemEvalV2Config, LongMemEvalV2Dataset } from '../config';
import { datasetDirOf, longMemEvalV2DirOf } from '../config';
import type { StageContext } from '../context';
import {
  downloadFile,
  readJson,
  streamFileLines,
  streamJsonArrayFile,
  writeJson,
} from '../download';
import type { LongMemEvalRecord } from '../datasets/longmemeval_s';
import * as longMemEvalS from '../datasets/longmemeval_s';
import type { LmeV2Haystack, LmeV2Question, LmeV2Trajectory } from '../datasets/longmemeval_v2';
import * as longMemEvalV2 from '../datasets/longmemeval_v2';
import { generatedTargetsFileOf } from '../targets';
import type { EvalConversation, ExtractedDataset } from '../types';

export const extractedFileOf = (dir: string): string => path.join(dir, 'extracted.json');

const extractLongMemEvalS = async (context: StageContext): Promise<ExtractedDataset> => {
  const { config, log, forceDownload } = context;
  const options = config.datasets.longmemeval_s;
  const dir = datasetDirOf(config, 'longmemeval_s');
  const { name, url } = longMemEvalS.variantFileOf(options);
  const file = await downloadFile({ url, dest: path.join(dir, name), force: forceDownload, log });
  log.info(`Reading the ${options.variant} variant of LongMemEval from ${name}`);
  const questions = await longMemEvalS.selectQuestionsFromStream(
    streamJsonArrayFile<LongMemEvalRecord>(file),
    options
  );
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

/**
 * The selected trajectories as conversations, in the order of `ids`. Streams the trajectories
 * file (1.2 GB) and converts each trajectory as it is read, so only the conversations are kept.
 */
const readConversations = async (
  file: string,
  ids: string[],
  options: LongMemEvalV2Config
): Promise<EvalConversation[]> => {
  const order = new Map(ids.map((id, index) => [id, index]));
  const found = new Map<string, EvalConversation>();
  for await (const line of streamFileLines(file)) {
    const id = longMemEvalV2.trajectoryIdOfLine(line);
    if (id !== undefined && !order.has(id)) {
      continue;
    }
    const trajectory = JSON.parse(line) as LmeV2Trajectory;
    const position = order.get(trajectory.id);
    if (position !== undefined) {
      found.set(
        trajectory.id,
        longMemEvalV2.trajectoryToConversation(trajectory, position, options)
      );
      if (found.size === order.size) {
        break;
      }
    }
  }
  const missing = ids.filter((id) => !found.has(id));
  if (missing.length > 0) {
    throw new Error(`trajectories.jsonl has no trajectories ${missing.slice(0, 5).join(', ')}…`);
  }
  return ids.flatMap((id) => found.get(id) ?? []);
};

const extractLongMemEvalV2 = async (
  context: StageContext,
  dataset: LongMemEvalV2Dataset
): Promise<ExtractedDataset> => {
  const { config, log, forceDownload } = context;
  const options = config.datasets[dataset];
  const dir = longMemEvalV2DirOf(config);
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
    await download(`haystacks/${longMemEvalV2.haystackFileOf(options.haystack)}`)
  );
  const selectedQuestions = longMemEvalV2.selectQuestions(questions, options, dataset);
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
  log.info(
    `Reading ${ids.length} trajectories of the ${options.haystack} haystack${
      options.per_sample ? 's' : ''
    } from trajectories.jsonl`
  );
  const conversations = await readConversations(await download('trajectories.jsonl'), ids, options);
  return {
    dataset,
    samples: selectedQuestions.map(({ id }) => id),
    sampleConversations: Object.fromEntries(
      selectedQuestions.map((question) => [
        question.id,
        (haystack[question.id] ?? []).slice(0, options.max_trajectories),
      ])
    ),
    agent: options.agent,
    conversations,
    targets: longMemEvalV2.targetsOf(selectedQuestions, dataset),
  };
};

const EXTRACTORS: Record<DatasetName, (context: StageContext) => Promise<ExtractedDataset>> = {
  longmemeval_s: extractLongMemEvalS,
  longmemeval_v2_enterprise: (context) =>
    extractLongMemEvalV2(context, 'longmemeval_v2_enterprise'),
  longmemeval_v2_web: (context) => extractLongMemEvalV2(context, 'longmemeval_v2_web'),
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
