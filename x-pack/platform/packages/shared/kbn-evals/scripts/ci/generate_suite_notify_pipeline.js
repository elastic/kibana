#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { readFileSync } = require('fs');
const { stringify } = require('yaml');

const STEP_OUTCOMES = ['hard_failed', 'passed'];

/**
 * Builds a one-step pipeline whose own Slack notify posts the message. `stepOutcome` is the
 * outcome of that step: `hard_failed` (default) runs `exit 1` for a failed suite, whose build is
 * already red; `passed` runs a soft-failing no-op, so the post never turns a green build red.
 */
const buildSuiteNotifyPipeline = ({
  message,
  slackChannel,
  stepOutcome = 'hard_failed',
  buildUrl = '',
  pipelineName = 'Buildkite',
  buildNumber = '',
}) => {
  if (!STEP_OUTCOMES.includes(stepOutcome)) {
    // Buildkite never matches any other outcome, so the step would fail the build and post nothing.
    throw new Error(
      `Invalid stepOutcome "${stepOutcome}"; expected one of: ${STEP_OUTCOMES.join(', ')}`
    );
  }

  const footer =
    buildUrl && !message.includes(buildUrl)
      ? `\n\n<${buildUrl}|${pipelineName} #${buildNumber}>`
      : '';
  const notify = [
    {
      slack: {
        channels: [slackChannel],
        message: `${message}${footer}`,
      },
      if: `step.outcome == "${stepOutcome}"`,
    },
  ];

  if (stepOutcome === 'passed') {
    // If this job fails for an infra reason, it ends soft_failed: no post, and the build stays green.
    return {
      steps: [
        {
          label: 'LLM Evals: suite owner Slack notify (non-blocking)',
          command: "echo 'Posted to Slack'",
          soft_fail: true,
          notify,
        },
      ],
    };
  }

  return {
    steps: [{ label: 'LLM Evals: suite owner Slack notify', command: 'exit 1', notify }],
  };
};

if (require.main === module) {
  const summaryPath = process.env.EVAL_TRIAGE_SUMMARY_PATH || '';
  const slackChannel = process.env.EVAL_SUITE_SLACK_CHANNEL || '';
  const stepOutcome = process.env.EVAL_NOTIFY_STEP_OUTCOME || 'hard_failed';

  const usage =
    'Usage: set EVAL_TRIAGE_SUMMARY_PATH (summary.md), EVAL_SUITE_SLACK_CHANNEL (slack channel) and optionally EVAL_NOTIFY_STEP_OUTCOME (hard_failed|passed, default hard_failed).';

  if (!summaryPath || !slackChannel) {
    console.error(usage);
    process.exit(1);
  }

  try {
    const pipeline = buildSuiteNotifyPipeline({
      message: readFileSync(summaryPath, 'utf8').trim(),
      slackChannel,
      stepOutcome,
      buildUrl: process.env.BUILDKITE_BUILD_URL || '',
      pipelineName: process.env.BUILDKITE_PIPELINE_NAME || 'Buildkite',
      buildNumber: process.env.BUILDKITE_BUILD_NUMBER || '',
    });
    process.stdout.write(stringify(pipeline));
  } catch (error) {
    console.error(`${error.message}\n${usage}`);
    process.exit(1);
  }
}

module.exports = { buildSuiteNotifyPipeline };
