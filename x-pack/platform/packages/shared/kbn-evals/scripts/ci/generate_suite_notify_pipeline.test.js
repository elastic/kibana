/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { buildSuiteNotifyPipeline } = require('./generate_suite_notify_pipeline');

const BUILD = {
  buildUrl: 'https://buildkite.com/elastic/kibana-evals-daily-llm-evals/builds/3',
  pipelineName: 'Kibana / Evals / Daily LLM Evals',
  buildNumber: '3',
};

describe('buildSuiteNotifyPipeline', () => {
  it('posts a failed suite from a failing step, so the post fires on hard_failed', () => {
    const {
      steps: [step],
    } = buildSuiteNotifyPipeline({ message: 'Suite failed', slackChannel: '#alerts', ...BUILD });

    expect(step.command).toBe('exit 1');
    expect(step.notify).toEqual([
      {
        slack: {
          channels: ['#alerts'],
          message: `Suite failed\n\n<${BUILD.buildUrl}|${BUILD.pipelineName} #3>`,
        },
        if: 'step.outcome == "hard_failed"',
      },
    ]);
  });

  it('posts a passed suite from a passing step, so the post does not fail the build', () => {
    const {
      steps: [step],
    } = buildSuiteNotifyPipeline({
      message: 'Suite passed',
      slackChannel: '#alerts',
      outcome: 'passed',
      ...BUILD,
    });

    expect(step.command).toBe("echo 'Posted to Slack'");
    expect(step.label).toBe('LLM Evals: suite owner Slack notify (passed)');
    expect(step.notify[0].if).toBe('step.outcome == "passed"');
    expect(step.notify[0].slack.channels).toEqual(['#alerts']);
  });

  it('does not repeat the build link when the message already has it', () => {
    const message = `Suite passed\n\n<${BUILD.buildUrl}|View build>`;
    const {
      steps: [step],
    } = buildSuiteNotifyPipeline({ message, slackChannel: '#alerts', outcome: 'passed', ...BUILD });

    expect(step.notify[0].slack.message).toBe(message);
  });
});
