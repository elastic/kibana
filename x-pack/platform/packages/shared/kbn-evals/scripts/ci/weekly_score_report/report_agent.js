/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const {
  buildOpenrouterChatRequest,
  postOpenrouterChat,
  redactSecrets,
} = require('../failure_context_helpers');
const { buildOpenrouterConnectorFromVault } = require('../ai_connectors');
const { shortDatasetName, toScoredRows } = require('./collect_weekly_scores');

const MAX_TURNS = 10;
const MAX_TOKENS = 4000;
const DEFAULT_TIME_BUDGET_MS = 5 * 60 * 1000;
const MAX_EXAMPLES_PER_CALL = 8;
const MAX_TOOL_RESULT_CHARS = 12_000;
// Cost and latency only make the report when they moved this much relative to last week.
const NOTABLE_COST_CHANGE = 0.25;

const REPORT_TOOL_NAME = 'report_weekly_scores';

const SYSTEM_PROMPT = `You write the weekly summary of an LLM evaluation suite for the team that owns the feature under test. The team reads it in Slack on Monday morning and wants to know: did quality change, what keeps failing and why, and what is worth working on.

How to read the data:
- Each slice is one (dataset, evaluator) pair for one task model. \`now\` is this week's mean score, \`prev\` last week's, \`history\` earlier weeks (newest first). Quality evaluators score 0..1, higher is better. Cost/latency slices are lower-is-better.
- Samples are small (often 1-25 scores), so most week-over-week changes are noise. Call a change real only when p < 0.05, or when the same change shows in several models, or when it continues a trend across \`history\`. Say "within noise" otherwise. Never present a change on 1-4 scores as a trend.
- \`failing\` counts scores below 1 this week. A slice that fails every week is a persistent issue, not a regression.

How to work:
- Before you name a cause, read the failing examples with \`list_failing_examples\`: the judge's explanation, the question and the agent's response. Check with \`get_example_scores\` whether other models fail the same example (that points at the dataset, the expected answer or the judge rather than one model), and with \`get_example_history\` whether it failed in earlier weeks.
- Group failures by cause, not by evaluator: one bad query often fails several evaluators at once.
- Be concrete: name the example question, the evaluator and what went wrong. Do not invent causes the explanations do not support; say "unclear" instead.
- Keep it short. You have a limited number of tool calls; spend them on the biggest or most persistent failures.
- Finish by calling \`${REPORT_TOOL_NAME}\` exactly once.`;

const sliceFilterProperties = {
  model: { type: 'string', description: 'Task model id; omit for every model' },
  dataset: { type: 'string', description: 'Dataset name as shown in the data' },
  evaluator: { type: 'string', description: 'Evaluator name; omit for every quality evaluator' },
};

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'list_failing_examples',
      description:
        "This week's scores below 1 in a dataset, with the judge's explanation, the question and the agent's response.",
      parameters: {
        type: 'object',
        properties: sliceFilterProperties,
        required: ['dataset'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_example_scores',
      description:
        "Every model's quality scores this week for one example, to see whether a failure is shared across models.",
      parameters: {
        type: 'object',
        properties: {
          dataset: sliceFilterProperties.dataset,
          example_id: { type: 'string' },
        },
        required: ['dataset', 'example_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_example_history',
      description:
        "One model's quality scores for one example in earlier weekly runs (matched by question), to tell a new failure from a recurring one.",
      parameters: {
        type: 'object',
        properties: {
          model: { type: 'string' },
          dataset: sliceFilterProperties.dataset,
          example_id: { type: 'string' },
        },
        required: ['model', 'dataset', 'example_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: REPORT_TOOL_NAME,
      description: 'Report the weekly summary. Call once, at the end.',
      parameters: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description: 'One or two sentences: the overall state this week and the main change.',
          },
          changes: {
            type: 'array',
            description: 'Up to 5 week-over-week changes worth knowing, real ones first.',
            items: {
              type: 'object',
              properties: {
                direction: { type: 'string', enum: ['regressed', 'improved'] },
                models: { type: 'array', items: { type: 'string' } },
                dataset: { type: 'string' },
                evaluator: { type: 'string' },
                detail: { type: 'string', description: 'What changed, with numbers' },
                confidence: {
                  type: 'string',
                  enum: ['significant', 'consistent', 'within_noise'],
                  description:
                    'significant: p < 0.05; consistent: several models or a multi-week trend; within_noise: otherwise',
                },
              },
              required: ['direction', 'models', 'dataset', 'detail', 'confidence'],
            },
          },
          persistentIssues: {
            type: 'array',
            description: 'Up to 4 failures that recur, grouped by cause.',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Short name of the problem' },
                models: { type: 'array', items: { type: 'string' } },
                dataset: { type: 'string' },
                evaluators: { type: 'array', items: { type: 'string' } },
                evidence: {
                  type: 'string',
                  description: 'Example question(s) and what the judge said',
                },
                likelyCause: {
                  type: 'string',
                  description: 'Agent bug, dataset/expected answer, judge, or unclear, and why',
                },
              },
              required: ['title', 'models', 'dataset', 'evidence', 'likelyCause'],
            },
          },
          focus: {
            type: 'array',
            description: '1 to 3 concrete things the team could work on next, most valuable first.',
            items: {
              type: 'object',
              properties: { title: { type: 'string' }, why: { type: 'string' } },
              required: ['title', 'why'],
            },
          },
        },
        required: ['summary', 'changes', 'persistentIssues', 'focus'],
      },
    },
  },
];

const round = (value) => (typeof value === 'number' ? Math.round(value * 1000) / 1000 : undefined);

const isNotableCostChange = (slice) =>
  slice.previousMean > 0 &&
  Math.abs(slice.mean - slice.previousMean) / slice.previousMean >= NOTABLE_COST_CHANGE;

/** The compact view of the collected scores the agent starts from. */
const buildScoresOverview = (scores) => ({
  suite: scores.suiteId,
  build: scores.build.buildNumber,
  models: scores.models.map((model) => ({
    model: model.model,
    comparedToBuild: model.baselineBuildNumber ?? null,
    qualityScore: round(model.qualityScore),
    qualityDelta: round(model.qualityDelta),
    quality: model.slices
      .filter((slice) => slice.direction === 'maximize')
      .map((slice) => ({
        dataset: slice.dataset,
        evaluator: slice.evaluator,
        scores: slice.scoreCount,
        now: round(slice.mean),
        prev: round(slice.previousMean),
        p: round(slice.pValue),
        history: slice.history.map((entry) => round(entry.mean)),
        failing: slice.failingCount,
      })),
    costChanges: model.slices
      .filter((slice) => slice.direction === 'minimize' && isNotableCostChange(slice))
      .map((slice) => ({
        dataset: slice.dataset,
        evaluator: slice.evaluator,
        now: round(slice.mean),
        prev: round(slice.previousMean),
        p: round(slice.pValue),
      })),
  })),
});

const matches = (value, filter) =>
  !filter || String(value).toLowerCase() === String(filter).toLowerCase();

const toExampleView = (row, model) => ({
  model,
  exampleId: row.exampleId,
  repetition: row.repetition,
  evaluator: row.evaluator,
  score: round(row.score),
  label: row.label,
  explanation: row.explanation,
  question: row.question,
  response: row.response,
  ...(row.errors ? { errors: row.errors } : {}),
});

const createToolHandlers = ({ scores, client }) => {
  const historyRowsCache = new Map();

  const loadHistoryRows = async (executionId, dataset) => {
    const cacheKey = `${executionId}\u0000${dataset}`;
    if (!historyRowsCache.has(cacheKey)) {
      const execution = await client.getExecution(executionId);
      const datasetStat = (execution.stats ?? []).find(
        (stat) => shortDatasetName(stat.dataset_name) === dataset
      );
      const rows = datasetStat
        ? toScoredRows(
            await client.getDatasetExamples(executionId, datasetStat.dataset_id),
            dataset
          )
        : [];
      historyRowsCache.set(cacheKey, rows);
    }
    return historyRowsCache.get(cacheKey);
  };

  return {
    list_failing_examples: async ({ model, dataset, evaluator }) => {
      const examples = scores.models
        .filter((entry) => matches(entry.model, model))
        .flatMap((entry) =>
          entry.scoredRows
            .filter(
              (row) =>
                row.direction === 'maximize' &&
                row.score < 1 &&
                matches(row.dataset, dataset) &&
                matches(row.evaluator, evaluator)
            )
            .map((row) => toExampleView(row, entry.model))
        );
      return {
        total: examples.length,
        examples: examples.slice(0, MAX_EXAMPLES_PER_CALL),
      };
    },

    get_example_scores: async ({ dataset, example_id: exampleId }) => {
      const byModel = scores.models.map((entry) => {
        const rows = entry.scoredRows.filter(
          (row) =>
            row.direction === 'maximize' &&
            matches(row.dataset, dataset) &&
            row.exampleId === String(exampleId)
        );
        return {
          model: entry.model,
          question: rows[0]?.question,
          scores: rows.map((row) => ({
            evaluator: row.evaluator,
            repetition: row.repetition,
            score: round(row.score),
          })),
        };
      });
      return { byModel };
    },

    get_example_history: async ({ model, dataset, example_id: exampleId }) => {
      const entry = scores.models.find((item) => matches(item.model, model));
      if (!entry) return { error: `Unknown model ${model}` };
      const question = entry.scoredRows.find(
        (row) => matches(row.dataset, dataset) && row.exampleId === String(exampleId)
      )?.question;
      if (!question) return { error: `No example ${exampleId} in ${dataset} for ${model}` };

      const weeks = [];
      for (const { buildNumber, executionId } of entry.historyExecutions) {
        const rows = (await loadHistoryRows(executionId, dataset)).filter(
          (row) => row.direction === 'maximize' && row.question === question
        );
        weeks.push({
          build: buildNumber,
          scores: rows.length
            ? rows.map((row) => ({ evaluator: row.evaluator, score: round(row.score) }))
            : 'example not in this run',
        });
      }
      return { question, weeks };
    },
  };
};

const resolveConnector = () => {
  const connector = buildOpenrouterConnectorFromVault();
  const modelOverride = process.env.EVAL_WEEKLY_REPORT_MODEL;
  if (modelOverride) {
    connector.config.providerConfig.model_id = modelOverride;
  }
  return connector;
};

const parseToolArguments = (raw) => {
  if (raw && typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return undefined;
  }
};

const runTool = async (handlers, name, args) => {
  const handler = handlers[name];
  if (!handler) return { error: `Unknown tool ${name}` };
  if (!args) return { error: 'Arguments were not valid JSON' };
  try {
    return await handler(args);
  } catch (error) {
    return { error: error.message };
  }
};

/**
 * Runs the report agent: it starts from the score overview, reads failing examples and their
 * history through tools, and ends with a structured `report_weekly_scores` call.
 */
const runWeeklyReportAgent = async ({
  scores,
  client,
  timeBudgetMs = DEFAULT_TIME_BUDGET_MS,
  chat = postOpenrouterChat,
  log = console.log,
}) => {
  const connector = resolveConnector();
  const handlers = createToolHandlers({ scores, client });
  const deadline = Date.now() + timeBudgetMs;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `This week's scores:\n${JSON.stringify(buildScoresOverview(scores))}`,
    },
  ];

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    const mustReport = turn === MAX_TURNS || Date.now() > deadline;
    const request = buildOpenrouterChatRequest(connector, messages, {
      maxTokens: MAX_TOKENS,
      tools: mustReport ? TOOLS.filter((tool) => tool.function.name === REPORT_TOOL_NAME) : TOOLS,
      toolChoice: mustReport ? { type: 'function', function: { name: REPORT_TOOL_NAME } } : 'auto',
    });
    const response = await chat(request);
    const message = response?.choices?.[0]?.message;
    if (!message) throw new Error('Report model returned no message');

    const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
    const reportCall = toolCalls.find((call) => call.function?.name === REPORT_TOOL_NAME);
    if (reportCall) {
      const report = parseToolArguments(reportCall.function.arguments);
      if (!report) throw new Error('Report tool arguments were not valid JSON');
      return { report, modelId: request.body.model, turns: turn };
    }

    messages.push({
      role: 'assistant',
      content: message.content ?? '',
      ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
    });
    if (!toolCalls.length) {
      messages.push({ role: 'user', content: `Call \`${REPORT_TOOL_NAME}\` now.` });
      continue;
    }
    for (const call of toolCalls) {
      const args = parseToolArguments(call.function?.arguments);
      log(`Report agent tool call: ${call.function?.name} ${JSON.stringify(args ?? {})}`);
      const result = await runTool(handlers, call.function?.name, args);
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: redactSecrets(JSON.stringify(result)).slice(0, MAX_TOOL_RESULT_CHARS),
      });
    }
  }
  throw new Error(`Report agent did not call ${REPORT_TOOL_NAME} within ${MAX_TURNS} turns`);
};

module.exports = { REPORT_TOOL_NAME, buildScoresOverview, runWeeklyReportAgent };
