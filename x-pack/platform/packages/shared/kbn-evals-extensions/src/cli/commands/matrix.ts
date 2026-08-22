/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { createFailError, createFlagError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import {
  EvalsClient,
  getEvaluationsKbnClient,
  envFromDatasetsProfile,
  DEFAULT_EVALUATIONS_KBN_URL,
} from '@kbn/evals';
import { KbnClient } from '@kbn/kbn-client';
import { loadMatrixConfig, applyModelOverrides } from '../../matrix/load_matrix_config';
import type { MatrixConfig } from '../../matrix/load_matrix_config';
import { queryMatrixScores } from '../../matrix/query_matrix_scores';
import { buildMatrix } from '../../matrix/build_matrix';
import { renderMatrix } from '../../matrix/render_matrix';
import { renderMatrixHtml } from '../../matrix/render_matrix_html';
import { queryMatrixTraces } from '../../matrix/query_matrix_traces';
import type { MatrixTraceData } from '../../matrix/trace_types';

const DEFAULT_OUT_DIR = 'target/llm_matrix';

export const matrixCmd: Command<void> = {
  name: 'matrix',
  description: `
  Generate an LLM performance matrix artifact from exported evaluation results.

  Reads the latest experiment per (model, suite) from the evals plugin on the
  target Kibana, maps suites/datasets/evaluators onto matrix columns via a config
  file, normalizes scores onto a 0-10 scale, and writes markdown + CSV + JSON.

  Configure target/auth with EVAL_KBN_URL and EVAL_KBN_API_KEY,
  with --kbn-url/--kbn-api-key, or with --profile (e.g. dev-vault for the golden
  cluster, or a config.<name>.json file).

  Example:
    node scripts/evals ext matrix \\
      --config .buildkite/pipelines/evals/security_matrix.config.json \\
      --profile dev-vault --branch main --out target/llm_matrix
  `,
  flags: {
    string: [
      'config',
      'out',
      'branch',
      'lookback-days',
      'profile',
      'kbn-url',
      'kbn-api-key',
      'model',
    ],
    boolean: ['html'],
    allowUnexpected: false,
    help: `
    --config           Path to the matrix config JSON (required).
    --out              Output directory for artifacts (default: ${DEFAULT_OUT_DIR}).
    --branch           Git branch filter override (default: config.branch).
    --lookback-days    Only consider experiments newer than now-<n>d (default: config.lookbackDays).
    --model            Replace the config's model set for an on-demand run.
                       Format: id[:label][:open-source]. Repeatable.
                       e.g. --model gpt-5-preview:GPT-5 --model qwen3:Qwen3:open-source
    --profile          Golden-cluster config profile providing EVAL_KBN_URL/API_KEY
                       (e.g. 'dev-vault' for runtime Vault, or a config.<name>.json file).
    --kbn-url          Kibana URL override.
    --kbn-api-key      Kibana API key override.
    --html             Also generate a self-contained HTML report (matrix.html).
    `,
  },
  run: async ({ log, flagsReader }) => {
    const configPath = flagsReader.string('config');
    if (!configPath) {
      throw createFlagError('--config is required. Provide the path to a matrix config JSON.');
    }

    const repoRoot = process.cwd();
    const baseConfig = loadMatrixConfig(Path.resolve(repoRoot, configPath));

    const modelOverrides = flagsReader.arrayOfStrings('model') ?? [];
    let config: MatrixConfig;
    try {
      config = applyModelOverrides(baseConfig, modelOverrides);
    } catch (error) {
      throw createFlagError(error instanceof Error ? error.message : String(error));
    }
    if (modelOverrides.length > 0) {
      log.info(
        `Overriding config model set with ${
          config.models.length
        } on-demand model(s): ${config.models.map((model) => model.id).join(', ')}`
      );
    }

    const profile = flagsReader.string('profile') ?? undefined;
    const profileEnv = envFromDatasetsProfile(repoRoot, profile);

    const evaluationsKbnUrl =
      flagsReader.string('kbn-url') ?? profileEnv.EVAL_KBN_URL ?? process.env.EVAL_KBN_URL;
    if (!evaluationsKbnUrl) {
      log.warning(`EVAL_KBN_URL not set; defaulting to ${DEFAULT_EVALUATIONS_KBN_URL}.`);
    }

    const evaluationsKbnApiKey =
      flagsReader.string('kbn-api-key') ??
      profileEnv.EVAL_KBN_API_KEY ??
      process.env.EVAL_KBN_API_KEY;

    const branch = flagsReader.string('branch') ?? config.branch;
    const lookbackDaysFlag = flagsReader.string('lookback-days');
    const lookbackDays = lookbackDaysFlag ? Number(lookbackDaysFlag) : config.lookbackDays;
    if (Number.isNaN(lookbackDays) || lookbackDays < 1) {
      throw createFlagError('--lookback-days must be a positive number.');
    }

    const outDir = Path.resolve(repoRoot, flagsReader.string('out') ?? DEFAULT_OUT_DIR);
    const suiteIds = [...new Set(config.columns.flatMap((column) => column.suites))];
    // Query per (suite, model) pair: the experiments route answers from a
    // terms aggregation that grows with the page number, so the listing must
    // stay bounded per pair. Include matchIds so aliased model rows are found.
    const modelIds = [
      ...new Set(config.models.flatMap((model) => [model.id, ...(model.matchIds ?? [])])),
    ];

    const defaultKbnClient = new KbnClient({ log, url: DEFAULT_EVALUATIONS_KBN_URL });
    const kbnClient = getEvaluationsKbnClient({
      kbnClient: defaultKbnClient,
      log,
      evaluationsKbnUrl,
      evaluationsKbnApiKey,
    });
    const evalsClient = new EvalsClient(kbnClient, log);

    try {
      await evalsClient.assertPluginEnabled();
    } catch (error) {
      throw createFlagError(
        [
          error instanceof Error ? error.message : String(error),
          'Set EVAL_KBN_URL to a Kibana instance with xpack.evals.enabled=true.',
          'Set EVAL_KBN_API_KEY when authenticating to a non-local target.',
        ].join('\n')
      );
    }

    log.info(
      `Querying matrix scores from ${evaluationsKbnUrl ?? DEFAULT_EVALUATIONS_KBN_URL} (branch: ${
        branch ?? 'any'
      })`
    );

    const aggregated = await queryMatrixScores(evalsClient, log, {
      suiteIds,
      modelIds,
      branch,
      lookbackDays,
      examplePrefixes: [
        ...new Set(config.columns.flatMap((column) => column.examplePrefixes ?? [])),
      ],
    });

    if (aggregated.length === 0) {
      // Empty CSVs would publish as a blank matrix in customer-facing docs.
      throw createFailError(
        [
          'No experiments matched the configured filters, refusing to write an empty matrix.',
          `Filters: suites=[${suiteIds.join(', ')}] models=[${modelIds.join(', ')}] branch=${
            branch ?? 'any'
          } lookbackDays=${lookbackDays}`,
          'Check that the weekly eval run published results for these suites in the lookback window.',
        ].join('\n')
      );
    }

    const matrix = buildMatrix(aggregated, config);
    const generateHtml = flagsReader.boolean('html');

    // Query traces before rendering so they can be embedded in matrix.json —
    // the artifact then carries everything needed to audit a cell's full
    // conversation without re-querying the evals cluster.
    let traces: MatrixTraceData | undefined;
    if (generateHtml) {
      log.info('Querying trace data for HTML report...');
      traces = await queryMatrixTraces(evalsClient, log, aggregated);
    }

    const rendered = renderMatrix(
      matrix,
      config,
      {
        branch,
        lookbackDays,
        suiteIds,
        commitSha: process.env.BUILDKITE_COMMIT,
        buildUrl: process.env.BUILDKITE_BUILD_URL,
      },
      traces
    );

    Fs.mkdirSync(outDir, { recursive: true });
    const writes: Array<[string, string]> = [
      ['proprietary-models.csv', rendered.proprietaryCsv],
      ['open-source-models.csv', rendered.openSourceCsv],
      ['matrix.md', rendered.markdown],
      ['matrix.json', rendered.json],
      // Raw, pre-scaling per-evaluator means/counts, so reviewers can audit which
      // evaluators feed a cell without re-querying.
      ['scores.debug.json', `${JSON.stringify(aggregated, null, 2)}\n`],
    ];
    for (const [fileName, contents] of writes) {
      Fs.writeFileSync(Path.join(outDir, fileName), contents);
    }

    if (generateHtml && traces) {
      const htmlContent = renderMatrixHtml(
        matrix,
        config,
        {
          branch,
          lookbackDays,
          suiteIds,
          commitSha: process.env.BUILDKITE_COMMIT,
          buildUrl: process.env.BUILDKITE_BUILD_URL,
          fixtureFingerprint: config.provenance?.fixtureFingerprint,
          methodologyNotes: config.provenance?.methodologyNotes,
        },
        traces
      );
      Fs.writeFileSync(Path.join(outDir, 'matrix.html'), htmlContent);
      log.info(`Wrote matrix.html to ${outDir}`);
    }

    log.info(
      `Wrote matrix artifacts to ${outDir} ` +
        `(${matrix.proprietary.length} proprietary, ${matrix.openSource.length} open-source models)`
    );
    log.info(`\n${rendered.markdown}`);
  },
};
