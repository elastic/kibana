/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import type { AiIndexEvalConfig } from './config';
import { datasetDirOf } from './config';
import type { StageContext } from './context';
import { readJson } from './download';
import type { EvalTarget } from './types';

export const generatedTargetsFileOf = (dir: string): string => path.join(dir, 'targets.json');

/** The targets a run was made for, kept with its KI dumps so a shared run is self-contained. */
export const runTargetsFileOf = (runDir: string): string => path.join(runDir, 'targets.json');

export const sampleOfTarget = ({ sample, id }: EvalTarget): string => sample ?? id;

const readTargets = (files: string[]): EvalTarget[] =>
  files.flatMap((file) => {
    if (!fs.existsSync(file)) {
      throw new Error(`No targets at ${file}: run the extract stage, or fix the targets path`);
    }
    return readJson<EvalTarget[]>(file);
  });

/** The targets extracted for an AI index: its own target files, else its datasets' targets. */
export const targetsOf = (context: StageContext, aiIndex: AiIndexEvalConfig): EvalTarget[] =>
  readTargets(
    aiIndex.targets.length > 0
      ? aiIndex.targets.map((file) => path.resolve(process.cwd(), file))
      : aiIndex.datasets.map((dataset) =>
          generatedTargetsFileOf(datasetDirOf(context.config, dataset))
        )
  );

/**
 * The targets to judge a run on: the AI index's own target files, else the targets the run was
 * made for, else those extracted for its datasets.
 */
export const targetsOfRun = (
  context: StageContext,
  aiIndex: AiIndexEvalConfig,
  runDir: string
): EvalTarget[] => {
  if (aiIndex.targets.length === 0 && fs.existsSync(runTargetsFileOf(runDir))) {
    return readJson<EvalTarget[]>(runTargetsFileOf(runDir));
  }
  return targetsOf(context, aiIndex);
};
