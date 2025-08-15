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
  numExamples: number;
  evaluatorScores: Map<string, number[]>; // Map of evaluator name to array of scores
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

    log.info(
      `Processing experiment for dataset: ${datasetId} with evaluation runs: ${JSON.stringify(
        evaluationRuns
      )}`
    );

    const numExamplesForExperiment = runs ? Object.keys(runs).length : 0;

    // Ensure dataset entry exists
    if (!datasetScoresMap.has(datasetId)) {
      datasetScoresMap.set(datasetId, {
        id: datasetId,
        name: datasetInfosById[datasetId]?.name ?? datasetId,
        numExamples: 0,
        evaluatorScores: new Map<string, number[]>(),
      });
    }

    const datasetScore = datasetScoresMap.get(datasetId)!;
    datasetScore.numExamples += numExamplesForExperiment;

    // Process evaluation runs
    if (evaluationRuns) {
      evaluationRuns.forEach((evalRun) => {
        const score = evalRun.result?.score ?? 0;

        // If evaluatorScores doesn't contain that evaluator by key, create an empty array
        if (!datasetScore.evaluatorScores.has(evalRun.name)) {
          datasetScore.evaluatorScores.set(evalRun.name, []);
        }

        // Add the score to the array
        datasetScore.evaluatorScores.get(evalRun.name)!.push(score);
      });
    }
  }

  log.info(
    `Dataset scores map with keys and values: ${JSON.stringify(
      Array.from(datasetScoresMap.entries())
    )}`
  );

  // Also log detailed evaluatorScores for each dataset (evaluator -> scores[])
  for (const [datasetId, dataset] of datasetScoresMap.entries()) {
    const evaluatorEntries = Array.from(dataset.evaluatorScores.entries());
    if (evaluatorEntries.length === 0) {
      log.info(`Dataset ${datasetId} (${dataset.name}) has no evaluator scores`);
      continue;
    }

    log.info(`Dataset ${datasetId} (${dataset.name}) evaluatorScores:`);
    evaluatorEntries.forEach(([evaluatorName, scores]) => {
      const total = scores.reduce((s, v) => s + v, 0);
      log.info(
        `  - ${evaluatorName}: scores=${JSON.stringify(scores)}, total=${total}, count=${
          scores.length
        }`
      );
    });
  }

  // Get all unique evaluator names across all datasets
  const allEvaluatorNames = new Set<string>();
  Array.from(datasetScoresMap.values()).forEach((dataset) => {
    dataset.evaluatorScores.forEach((_, evaluatorName) => {
      allEvaluatorNames.add(evaluatorName);
    });
  });
  const evaluatorNames = Array.from(allEvaluatorNames).sort();

  log.info(`Evaluator names found: ${JSON.stringify(evaluatorNames)}`);

  const datasetScores = Array.from(datasetScoresMap.values()).map((dataset) => ({
    ...dataset,
    evaluatorPercents: new Map(
      evaluatorNames.map((evaluatorName) => {
        const scores = dataset.evaluatorScores.get(evaluatorName) || [];
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        return [evaluatorName, dataset.numExamples > 0 ? totalScore / dataset.numExamples : 0];
      })
    ),
  }));

  if (datasetScores.length === 0) {
    log.error(`No dataset scores were available`);
    return;
  }

  log.info(`The following dataset scores were calculated: ${JSON.stringify(datasetScores)}`);

  // Calculate average and weighted percentages for each evaluator
  const evaluatorAverages = new Map<string, number>();
  const evaluatorWeighted = new Map<string, number>();
  const totalExamples = sumBy(datasetScores, (d) => d.numExamples);

  evaluatorNames.forEach((evaluatorName) => {
    // Calculate average percentage (unweighted)
    const percentages = datasetScores.map((d) => d.evaluatorPercents.get(evaluatorName) || 0);
    const average = mean(percentages);
    evaluatorAverages.set(evaluatorName, average);

    // Calculate weighted percentage
    const totalScore = sumBy(datasetScores, (d) => {
      const scores = d.evaluatorScores.get(evaluatorName) || [];
      return scores.reduce((sum, score) => sum + score, 0);
    });
    const weighted = totalExamples > 0 ? totalScore / totalExamples : 0;
    evaluatorWeighted.set(evaluatorName, weighted);
  });

  const header = [`Model: ${model.id} (${model.family}/${model.provider})`];

  // Build table headers dynamically
  const tableHeader = ['Dataset', '# Examples', ...evaluatorNames.map((name) => `${name} %`)];

  const datasetRows = datasetScores.map((dataset) => {
    const values = [dataset.name, dataset.numExamples.toString()];

    // Add percentage values for each evaluator, or "-" if not available
    evaluatorNames.forEach((evaluatorName) => {
      const percent = dataset.evaluatorPercents.get(evaluatorName);
      const scores = dataset.evaluatorScores.get(evaluatorName);
      if (percent !== undefined && scores && scores.length > 0) {
        values.push(chalk.bold.yellow((percent * 100).toFixed(1) + '%'));
      } else {
        values.push('-');
      }
    });

    return values;
  });

  // Build summary rows dynamically
  const emptyRow = Array(tableHeader.length).fill('');
  const averageRow = [
    'Average %',
    '',
    ...evaluatorNames.map((name) => {
      const avg = evaluatorAverages.get(name) || 0;
      return chalk.bold.yellow((avg * 100).toFixed(1) + '%');
    }),
  ];
  const weightedRow = [
    'Weighted %',
    '',
    ...evaluatorNames.map((name) => {
      const weighted = evaluatorWeighted.get(name) || 0;
      return chalk.bold.yellow((weighted * 100).toFixed(1) + '%');
    }),
  ];

  const summaryRows = [emptyRow, averageRow, weightedRow];

  // Build column alignment configuration dynamically
  const columnConfig: Record<number, { alignment: 'right' }> = {};
  for (let i = 1; i < tableHeader.length; i++) {
    columnConfig[i] = { alignment: 'right' };
  }

  const output = table([tableHeader, ...datasetRows, ...summaryRows], {
    columns: columnConfig,
  });

  log.info(`\n\n${header[0]}\n${output}`);
}
