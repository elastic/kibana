/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SomeDevLog } from '@kbn/some-dev-log';
import { Model } from '@kbn/inference-common';
import { RanExperiment } from '@arizeai/phoenix-client/dist/esm/types/experiments';
import { sumBy, mean, keyBy, uniq } from 'lodash';
import { table } from 'table';
import chalk from 'chalk';
import { KibanaPhoenixClient } from '../kibana_phoenix_client/client';

interface DatasetScore {
  id: string;
  name: string;
  totalScore: number;
  numExamples: number;
}

export async function reportModelScore({
  log,
  phoenixClient,
  model,
  experiments,
}: {
  log: SomeDevLog;
  phoenixClient: KibanaPhoenixClient;
  model: Model;
  experiments: RanExperiment[];
}): Promise<void> {
  const allDatasetIds = uniq(experiments.flatMap((experiment) => experiment.datasetId));

  const datasetInfos = await phoenixClient.getDatasets(allDatasetIds);

  const datasetInfosById = keyBy(datasetInfos, (datasetInfo) => datasetInfo.id);

  const datasetScoresMap = new Map<string, DatasetScore>();

  for (const experiment of experiments) {
    const { datasetId, evaluationRuns, runs } = experiment;

    const totalScoreForExperiment = evaluationRuns
      ? sumBy(evaluationRuns, (ev) => ev.result?.score ?? 0)
      : 0;

    const numExamplesForExperiment = runs ? Object.keys(runs).length : 0;

    const existing = datasetScoresMap.get(datasetId);

    if (existing) {
      existing.totalScore += totalScoreForExperiment;
      existing.numExamples += numExamplesForExperiment;
    } else {
      datasetScoresMap.set(datasetId, {
        id: datasetId,
        name: datasetInfosById[datasetId]?.name ?? datasetId,
        totalScore: totalScoreForExperiment,
        numExamples: numExamplesForExperiment,
      });
    }
  }

  const datasetScores = Array.from(datasetScoresMap.values()).map((dataset) => {
    return {
      ...dataset,
      percent: dataset.totalScore / dataset.numExamples,
    };
  });

  if (datasetScores.length === 0) {
    log.error(`No dataset scores were available`);
    return;
  }

  // Average (unweighted) percent across datasets
  const averagePercent = mean(datasetScores.map((d) => d.percent));

  // Weighted percent across datasets (by number of examples)
  const totalExamples = sumBy(datasetScores, (d) => d.numExamples);
  const weightedPercent =
    totalExamples === 0 ? 0 : sumBy(datasetScores, (d) => d.totalScore) / totalExamples;

  const header = [`Model: ${model.id} (${model.family}/${model.provider})`];
  const tableHeader = ['Dataset', 'Total Score', '# Examples', '%'];

  const datasetRows = datasetScores.map(({ name, totalScore, numExamples, percent }) => {
    const values = [
      name,
      totalScore,
      numExamples.toString(),
      chalk.bold.yellow((percent! * 100).toFixed(1) + '%'),
    ];
    return values;
  });

  const summaryRows = [
    ['', '', '', ''],
    ['Average %', '', '', chalk.bold.yellow((averagePercent * 100).toFixed(1) + '%')],
    ['Weighted %', '', '', chalk.bold.yellow((weightedPercent * 100).toFixed(1) + '%')],
  ];

  const output = table([tableHeader, ...datasetRows, ...summaryRows], {
    columns: {
      1: { alignment: 'right' },
      2: { alignment: 'right' },
      3: { alignment: 'right' },
    },
  });

  log.info(`\n\n${header[0]}\n${output}`);
}
