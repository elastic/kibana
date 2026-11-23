/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const WEEKLY_PIPELINE_SLUG = 'kibana-evals-weekly-llm-evals';
const DEFAULT_HISTORY_WEEKS = 4;
const MAX_TEXT_CHARS = 600;

const truncate = (text, maxChars = MAX_TEXT_CHARS) => {
  const value = String(text ?? '').trim();
  return value.length > maxChars ? `${value.slice(0, maxChars - 1)}…` : value;
};

const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const parseBuildNumber = (buildUrl) => {
  const match = /\/builds\/(\d+)/.exec(buildUrl ?? '');
  return match ? Number(match[1]) : undefined;
};

const modelOfExecution = (experiment) =>
  String(experiment.execution_id ?? '').split('::')[2] || experiment.task_model?.id || 'unknown';

/** Dataset names repeat the suite name ("agent builder visualizations: standalone ..."). */
const shortDatasetName = (datasetName) =>
  String(datasetName ?? '')
    .replace(/^[^:]+:\s*/, '')
    .trim() || String(datasetName ?? '');

const sliceKey = (datasetName, evaluatorName) => `${datasetName}\u0000${evaluatorName}`;

const ESTIMATED_COST_EVALUATOR_NAME = 'Estimated Cost (USD)';

/** Sum of the estimated task cost over every priced run (example × repetition) of the execution. */
const sumEstimatedCost = (execution) => {
  const costStats = (Array.isArray(execution?.stats) ? execution.stats : []).filter(
    (stat) => stat.evaluator_name === ESTIMATED_COST_EVALUATOR_NAME && stat.stats?.count
  );
  if (!costStats.length) return undefined;
  return {
    usd: costStats.reduce((sum, { stats }) => sum + (stats.mean ?? 0) * stats.count, 0),
    pricedRuns: costStats.reduce((sum, { stats }) => sum + stats.count, 0),
  };
};

/**
 * Groups the suite's experiments into weekly builds of the given pipeline, newest first, each with
 * one execution id per task model.
 */
const groupWeeklyBuilds = (experiments, pipelineSlug = WEEKLY_PIPELINE_SLUG) => {
  const builds = new Map();
  for (const experiment of experiments) {
    const buildUrl = experiment.ci?.build_url ?? '';
    if (!buildUrl.includes(`/${pipelineSlug}/`) || !experiment.execution_id) continue;
    const buildNumber = parseBuildNumber(buildUrl);
    if (buildNumber === undefined) continue;

    const build = builds.get(buildNumber) ?? {
      buildNumber,
      buildUrl,
      timestamp: experiment.timestamp,
      executions: {},
    };
    build.executions[modelOfExecution(experiment)] = experiment.execution_id;
    if (experiment.timestamp && experiment.timestamp < build.timestamp) {
      build.timestamp = experiment.timestamp;
    }
    builds.set(buildNumber, build);
  }
  return [...builds.values()].sort((a, b) => b.buildNumber - a.buildNumber);
};

const readExampleQuestion = (preview) => {
  const content = preview?.input?.content;
  const parsed = parseJson(content);
  return truncate(parsed?.question ?? parsed?.input ?? content, 300);
};

// Previews are cut to a preview length, so the JSON often does not parse; read the last message
// straight from the text then.
const readLastMessageFromText = (content) => {
  const matches = [...String(content ?? '').matchAll(/"message":"((?:[^"\\]|\\.)*)/g)];
  const raw = matches[matches.length - 1]?.[1];
  if (raw === undefined) return undefined;
  return parseJson(`"${raw.replace(/\\$/, '')}"`) ?? raw;
};

const readExampleResponse = (preview) => {
  const content = preview?.output?.content;
  const parsed = parseJson(content);
  const messages = Array.isArray(parsed?.messages) ? parsed.messages : [];
  const lastMessage = parsed
    ? messages[messages.length - 1]?.message
    : readLastMessageFromText(content);
  const errors = Array.isArray(parsed?.errors) && parsed.errors.length ? parsed.errors : undefined;
  return {
    response: truncate(lastMessage ?? content, 500),
    errors: errors ? truncate(JSON.stringify(errors), 300) : undefined,
  };
};

/**
 * Flattens one dataset's examples into scored rows (one per example, repetition and evaluator),
 * dropping skipped scores (`score: null`).
 */
const toScoredRows = (examples, datasetName) => {
  const rows = [];
  for (const example of examples) {
    const previews = Array.isArray(example.previews) ? example.previews : [];
    for (const score of Array.isArray(example.scores) ? example.scores : []) {
      const evaluator = score.evaluator ?? {};
      if (typeof evaluator.score !== 'number') continue;
      const repetition = score.task?.repetition_index ?? 0;
      const preview =
        previews.find((item) => item.repetition_index === repetition) ?? previews[0] ?? {};
      rows.push({
        dataset: datasetName,
        exampleId: String(example.example_id ?? score.example?.id ?? ''),
        repetition,
        evaluator: evaluator.name,
        direction: evaluator.direction ?? 'maximize',
        score: evaluator.score,
        label: evaluator.label,
        explanation: truncate(evaluator.explanation ?? evaluator.metadata?.reason ?? ''),
        question: readExampleQuestion(preview),
        ...readExampleResponse(preview),
      });
    }
  }
  return rows;
};

const meansBySlice = (execution) => {
  const means = new Map();
  for (const stat of Array.isArray(execution?.stats) ? execution.stats : []) {
    const mean = stat.stats?.mean;
    const count = stat.stats?.count ?? 0;
    // A slice whose every score was skipped reports `mean: 0` with `count: 0`.
    if (typeof mean !== 'number' || count === 0) continue;
    means.set(sliceKey(shortDatasetName(stat.dataset_name), stat.evaluator_name), {
      mean,
      count,
    });
  }
  return means;
};

/** Mean over every score in the slices, so a slice with one score cannot swing the headline. */
const weightedMean = (slices, pickMean) => {
  const total = slices.reduce((sum, slice) => sum + slice.scoreCount, 0);
  return total
    ? slices.reduce((sum, slice) => sum + pickMean(slice) * slice.scoreCount, 0) / total
    : undefined;
};

const collectModelScores = async ({ client, model, executionId, previousBuilds, historyWeeks }) => {
  const execution = await client.getExecution(executionId);
  const datasets = new Map();
  for (const stat of execution.stats ?? []) {
    datasets.set(stat.dataset_id, shortDatasetName(stat.dataset_name));
  }

  const scoredRows = [];
  for (const [datasetId, datasetName] of datasets) {
    const examples = await client.getDatasetExamples(executionId, datasetId);
    scoredRows.push(...toScoredRows(examples, datasetName));
  }
  const directions = new Map();
  for (const row of scoredRows) directions.set(row.evaluator, row.direction);

  const historyBuilds = previousBuilds
    .filter((build) => build.executions[model])
    .slice(0, historyWeeks);
  const history = [];
  for (const build of historyBuilds) {
    const previous = await client.getExecution(build.executions[model]);
    history.push({
      buildNumber: build.buildNumber,
      executionId: build.executions[model],
      means: meansBySlice(previous),
    });
  }

  const baseline = history[0];
  const pValues = new Map();
  if (baseline) {
    const comparison = await client.compareExecutions(baseline.executionId, executionId);
    for (const result of comparison?.results ?? []) {
      const key = sliceKey(shortDatasetName(result.datasetName), result.evaluatorName);
      pValues.set(key, { pValue: result.pValue, metricType: result.metricType });
      if (result.direction) directions.set(result.evaluatorName, result.direction);
    }
  }

  const slices = [];
  for (const [key, { mean, count }] of meansBySlice(execution)) {
    const [dataset, evaluator] = key.split('\u0000');
    const direction = directions.get(evaluator) ?? 'neutral';
    if (direction === 'neutral') continue;
    const failing =
      direction === 'maximize'
        ? scoredRows.filter(
            (row) => row.dataset === dataset && row.evaluator === evaluator && row.score < 1
          )
        : [];
    slices.push({
      dataset,
      evaluator,
      direction,
      metricType: pValues.get(key)?.metricType,
      scoreCount: count,
      mean,
      previousMean: baseline?.means.get(key)?.mean,
      pValue: pValues.get(key)?.pValue ?? undefined,
      history: history.map((entry) => ({
        buildNumber: entry.buildNumber,
        mean: entry.means.get(key)?.mean,
      })),
      failingCount: failing.length,
    });
  }

  const quality = slices.filter((slice) => slice.direction === 'maximize');
  const paired = quality.filter((slice) => slice.previousMean !== undefined);

  return {
    model,
    executionId,
    baselineBuildNumber: baseline?.buildNumber,
    baselineExecutionId: baseline?.executionId,
    historyExecutions: history.map(({ buildNumber, executionId: id }) => ({
      buildNumber,
      executionId: id,
    })),
    datasetIds: Object.fromEntries([...datasets].map(([id, name]) => [name, id])),
    estimatedCost: sumEstimatedCost(execution),
    qualityScore: weightedMean(quality, (slice) => slice.mean),
    qualityDelta: paired.length
      ? weightedMean(paired, (slice) => slice.mean) -
        weightedMean(paired, (slice) => slice.previousMean)
      : undefined,
    slices,
    scoredRows,
  };
};

/**
 * Collects the scores of one weekly build of a suite: per model, the mean of every
 * (dataset, evaluator) slice, last week's mean, earlier weeks' means, the paired-test p-value against
 * last week, and every scored example row so the report agent can read the judges' explanations.
 */
const collectWeeklyScores = async ({
  client,
  suiteId,
  branch = 'main',
  pipelineSlug = WEEKLY_PIPELINE_SLUG,
  buildNumber,
  historyWeeks = DEFAULT_HISTORY_WEEKS,
}) => {
  const builds = groupWeeklyBuilds(await client.listExperiments({ suiteId, branch }), pipelineSlug);
  const current = buildNumber
    ? builds.find((build) => build.buildNumber === Number(buildNumber))
    : builds[0];
  if (!current) {
    throw new Error(
      `No scores for ${suiteId} in ${pipelineSlug} build ${buildNumber ?? '(latest)'} on ${branch}`
    );
  }
  const previousBuilds = builds.filter((build) => build.buildNumber < current.buildNumber);

  const models = [];
  for (const [model, executionId] of Object.entries(current.executions).sort()) {
    models.push(
      await collectModelScores({ client, model, executionId, previousBuilds, historyWeeks })
    );
  }

  return { suiteId, build: current, models };
};

module.exports = {
  WEEKLY_PIPELINE_SLUG,
  collectWeeklyScores,
  groupWeeklyBuilds,
  shortDatasetName,
  toScoredRows,
};
