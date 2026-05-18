#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { readFileSync } = require('fs');
const { fromRoot } = require('@kbn/repo-info');

const SUITES_PATH = fromRoot('.buildkite/pipelines/evals/evals.suites.json');

function normalizeBuildkiteKey(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Mirrors normalizeEvaluationConnectorId in eval_pipeline.ts.
 */
function normalizeEvaluationConnectorId(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith('eis/')) {
    return `eis-${normalizeBuildkiteKey(trimmed.slice('eis/'.length))}`;
  }

  if (trimmed.includes('/')) {
    return `litellm-${normalizeBuildkiteKey(trimmed)}`;
  }

  return trimmed;
}

function parseArgs(argv) {
  const args = { suite: '', model: '', judge: '', format: 'json' };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--suite' && argv[i + 1]) {
      args.suite = argv[++i].trim();
    } else if (arg === '--model' && argv[i + 1]) {
      args.model = argv[++i].trim();
    } else if (arg === '--judge' && argv[i + 1]) {
      args.judge = argv[++i].trim();
    } else if (arg === '--format' && argv[i + 1]) {
      args.format = argv[++i].trim();
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }
  return args;
}

function loadSuites() {
  const raw = readFileSync(SUITES_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed?.suites) ? parsed.suites : [];
}

function resolveOnDemandEvalEnv({ suiteId, model, judge }) {
  if (!suiteId) {
    throw new Error('Suite id is required (--suite)');
  }
  if (!model) {
    throw new Error('Model is required (--model)');
  }

  const suites = loadSuites();
  const suite = suites.find((s) => s?.id === suiteId);
  if (!suite) {
    const known = suites
      .map((s) => s.id)
      .filter(Boolean)
      .sort()
      .join(', ');
    throw new Error(`Unknown eval suite "${suiteId}". Known suites: ${known || '(none)'}`);
  }

  const env = {
    EVAL_SUITE_ID: suiteId,
    EVAL_MODEL_GROUPS: model,
    FTR_EIS_CCM: '1',
    EVAL_FANOUT: '1',
  };

  if (model.startsWith('eis/')) {
    env.EVAL_INCLUDE_EIS_MODELS = '1';
  }

  if (suite.serverConfigSet) {
    env.EVAL_SERVER_CONFIG_SET = suite.serverConfigSet;
  }

  const evaluationConnectorId = judge ? normalizeEvaluationConnectorId(judge) : undefined;
  if (evaluationConnectorId) {
    env.EVALUATION_CONNECTOR_ID = evaluationConnectorId;
    if (judge.startsWith('eis/') || evaluationConnectorId.startsWith('eis-')) {
      env.EVAL_INCLUDE_EIS_MODELS = '1';
    }
  }

  return env;
}

function printUsage() {
  console.error(`Usage:
  node resolve_on_demand_eval_env.js --suite <id> --model <model-group> [--judge <connector-or-model>]
    [--format json|env]

Examples:
  --suite agent-builder --model eis/openai-gpt-5.4
  --suite agent-builder --model llm-gateway/gpt-5.1 --judge eis/anthropic-claude-4.6-sonnet
`);
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printUsage();
    process.exit(0);
  }

  let env;
  try {
    env = resolveOnDemandEvalEnv({
      suiteId: args.suite,
      model: args.model,
      judge: args.judge,
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  if (args.format === 'env') {
    for (const [key, value] of Object.entries(env)) {
      process.stdout.write(`${key}=${value}\n`);
    }
    return;
  }

  process.stdout.write(`${JSON.stringify(env)}\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  normalizeBuildkiteKey,
  normalizeEvaluationConnectorId,
  resolveOnDemandEvalEnv,
};
