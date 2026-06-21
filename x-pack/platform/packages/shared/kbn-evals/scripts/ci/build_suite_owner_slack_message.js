#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { readFileSync, writeFileSync } = require('fs');
const { fromRoot } = require('./repo_root');
const { resolveTriageModelId } = require('./failure_context_helpers');
const { summarizeFailuresWithModel } = require('./summarize_failures_with_model');
const { collectFailureContext } = require('./collect_failure_context');

const suiteId = process.argv[2] || process.env.EVAL_SUITE_ID || '';
const failingProjectsArg = process.argv[3] || process.env.EVAL_FAILING_PROJECTS || '';

// Output paths: write Slack-markdown and/or GitHub-markdown renderings of the
// same triage. At least one must be provided.
const slackOutputPath = process.env.EVAL_TRIAGE_SLACK_OUT || '';
const githubOutputPath = process.env.EVAL_TRIAGE_GITHUB_OUT || '';

// Notification mode controls the header/intro so on-demand and weekly per-suite
// messages read differently even though they share this builder.
// - 'on-demand': ad-hoc verification triggered by a person.
// - 'weekly': scheduled run alert for the owning team.
function resolveNotifyMode() {
  const explicit = (process.argv[4] || process.env.EVAL_NOTIFY_MODE || '').toLowerCase();
  return explicit === 'on-demand' ? 'on-demand' : 'weekly';
}

const notifyMode = resolveNotifyMode();

if (!suiteId || !failingProjectsArg || (!slackOutputPath && !githubOutputPath)) {
  console.error(
    'Usage: build_suite_owner_slack_message.js <suiteId> <comma-separated failing projects> [on-demand|weekly]\n' +
      '  Set EVAL_TRIAGE_SLACK_OUT and/or EVAL_TRIAGE_GITHUB_OUT to choose output renderings.'
  );
  process.exit(1);
}

const failingProjects = failingProjectsArg
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (failingProjects.length === 0) {
  console.error('At least one failing project is required');
  process.exit(1);
}

const suitesPath = fromRoot('.buildkite/pipelines/evals/evals.suites.json');
const parsed = JSON.parse(readFileSync(suitesPath, 'utf8'));
const suites = Array.isArray(parsed?.suites) ? parsed.suites : [];
const suite = suites.find((entry) => entry?.id === suiteId) ?? null;
const suiteName = suite?.name ?? suiteId;
const buildUrl = process.env.BUILDKITE_BUILD_URL || '';

const headerLabel = notifyMode === 'on-demand' ? 'On-demand LLM eval' : 'Weekly LLM evals';
const headerEmoji = notifyMode === 'on-demand' ? ':test_tube:' : ':rotating_light:';

/**
 * @typedef {{ error: string; location: string; models: string[]; rootCause: string }} TriageGroup
 * @typedef {{ modelId: string; groups?: TriageGroup[]; error?: string }} Triage
 */

/**
 * Deterministically render the structured triage groups. The error log goes in a
 * fenced code block (plain ``` for Slack, ```sh for GitHub) and the location and
 * model ids render as inline `code`. Only the grouping and root cause come from
 * the model; all formatting is owned here.
 *
 * @param {Triage} triage
 * @param {string} openFence
 * @returns {string}
 */
function renderTriageBody(triage, openFence) {
  if (triage.error) {
    return `_Triage summary could not be generated: ${triage.error}. See the suite owner notify Buildkite step for details._`;
  }

  const groups = Array.isArray(triage.groups) ? triage.groups : [];
  if (groups.length === 0) {
    return '_No clear error found in the logs; see the build for details._';
  }

  return groups
    .map((group) => {
      const block = [];
      if (group.error) {
        block.push(openFence, group.error, '```');
      }
      const meta = [];
      if (group.location) {
        meta.push(`\`${group.location}\``);
      }
      if (Array.isArray(group.models) && group.models.length > 0) {
        meta.push(group.models.map((model) => `\`${model}\``).join(', '));
      }
      if (meta.length > 0) {
        block.push(meta.join(' — '));
      }
      if (group.rootCause) {
        block.push(`Root cause: ${group.rootCause}`);
      }
      return block.join('\n');
    })
    .join('\n\n');
}

/**
 * Render the message in Slack mrkdwn (`*bold*`, `<url|text>`).
 *
 * @param {Triage} triage
 * @returns {string}
 */
function renderSlack(triage) {
  const lines = [
    `${headerEmoji} *${headerLabel}* — ${suiteName} (\`${suiteId}\`) failed.`,
    '',
    '*Failing models:*',
    ...failingProjects.map((project) => `- \`${project}\``),
  ];
  if (buildUrl) {
    lines.push('', `<${buildUrl}|View build>`);
  }
  lines.push('', '*Triage summary:*', renderTriageBody(triage, '```'));
  return `${lines.join('\n')}\n`;
}

/**
 * Render the message in GitHub-flavored markdown (`**bold**`, `[text](url)`).
 *
 * @param {Triage} triage
 * @returns {string}
 */
function renderGithub(triage) {
  const lines = [
    `${headerEmoji} **${headerLabel}** — ${suiteName} (\`${suiteId}\`) failed.`,
    '',
    '**Failing models:**',
    ...failingProjects.map((project) => `- \`${project}\``),
  ];
  if (buildUrl) {
    lines.push('', `[View build](${buildUrl})`);
  }
  lines.push('', '**Triage summary:**', '', renderTriageBody(triage, '```sh'));
  return `${lines.join('\n')}\n`;
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function formatTriageError(error) {
  return error instanceof Error ? error.message : String(error);
}

async function main() {
  const fallbackModelId = resolveTriageModelId() || 'unknown';

  // Single LLM call returns structured groups; both renderings format them
  // deterministically for Slack and GitHub.
  /** @type {Triage} */
  let triage = { modelId: fallbackModelId, groups: [] };
  try {
    console.error('--- Collecting failure context for triage summary');
    const context = collectFailureContext({
      suiteId,
      suiteName,
      failingProjects,
      buildId: process.env.BUILDKITE_BUILD_ID,
      buildUrl,
    });

    console.error(`--- Generating triage summary (model: ${fallbackModelId})`);
    const { groups, modelId } = await summarizeFailuresWithModel(context);
    triage = { modelId, groups };
  } catch (error) {
    const message = formatTriageError(error);
    console.error(`--- Triage summary failed: ${message}`);
    triage = { modelId: fallbackModelId, error: message };
  }

  if (slackOutputPath) {
    writeFileSync(slackOutputPath, renderSlack(triage), 'utf8');
  }
  if (githubOutputPath) {
    writeFileSync(githubOutputPath, renderGithub(triage), 'utf8');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
