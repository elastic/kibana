/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSecretScannerEvaluator } from '../secret_scanner';

// Synthetic test fixtures built via concatenation so no line resembles a real
// credential that would trip repo/secret scanners.
const AWS_KEY = 'AKIA' + 'IOSFODNN7EXAMPLE';
const GH_PAT = 'ghp_' + 'a'.repeat(36);
// Trailing token must avoid literal "XXXX" / "changeme" / angle brackets so
// the placeholder-detector doesn't short-circuit the match.
const SLACK_WEBHOOK =
  'https://hooks.slack.com/services/T00000000/B00000000/abc123DEF456gh';
const JWT =
  'eyJ' + 'hbGciOiJIUzI1NiJ9.' + 'eyJzdWIiOiIxMjM0NTY3ODkwIn0.' + 'XYZabc' + '123456789';
const HIGH_ENTROPY_GH_PAT = 'ghp_' + '1234567890abcdefghij1234567890abcdefgh';

describe('secret_scanner evaluator', () => {
  const evaluator = createSecretScannerEvaluator();

  const evaluate = (output: string) =>
    evaluator.evaluate({ input: undefined, output, expected: undefined, metadata: undefined });

  it('passes on skill content with no secrets', async () => {
    const result = await evaluate(
      'FROM logs-* | WHERE user.name == "alice" | STATS count() BY host.name'
    );
    expect(result.score).toBe(1.0);
    expect(result.label).toBe('pass');
  });

  it('detects AWS access keys', async () => {
    const result = await evaluate(`export AWS_ACCESS_KEY_ID=${AWS_KEY}`);
    expect(result.score).toBe(0.0);
    expect(result.label).toBe('fail');
    expect(result.explanation).toContain('aws-access-key');
  });

  it('detects GitHub personal access tokens', async () => {
    const result = await evaluate(`token: ${GH_PAT}`);
    expect(result.score).toBe(0.0);
    expect(result.explanation).toContain('github-pat');
  });

  it('detects Slack webhooks', async () => {
    const result = await evaluate(`POST ${SLACK_WEBHOOK}`);
    expect(result.score).toBe(0.0);
    expect(result.explanation).toContain('slack-webhook');
  });

  it('detects JWT tokens', async () => {
    const result = await evaluate(`Authorization: Bearer ${JWT}`);
    expect(result.score).toBe(0.0);
  });

  it('detects PEM private-key blocks', async () => {
    const result = await evaluate(`Sample config:
-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----`);
    expect(result.score).toBe(0.0);
    expect(result.explanation).toContain('private-key-block');
  });

  it('does not flag placeholder tokens', async () => {
    const result = await evaluate(
      'Set `api_key: <your-api-key-here>` or `token=changeme` in the config'
    );
    expect(result.score).toBe(1.0);
  });

  it('does not flag low-entropy examples', async () => {
    const result = await evaluate('api_key = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"');
    expect(result.score).toBe(1.0);
  });

  it('redacts the secret in the explanation', async () => {
    const result = await evaluate(`token=${HIGH_ENTROPY_GH_PAT}`);
    expect(result.score).toBe(0.0);
    const metadata = result.metadata as { findings: Array<{ match: string }> };
    expect(metadata.findings[0].match).not.toContain(HIGH_ENTROPY_GH_PAT);
    expect(metadata.findings[0].match).toContain('…');
  });

  it('has correct name and kind', () => {
    expect(evaluator.name).toBe('skill-secret-scanner');
    expect(evaluator.kind).toBe('CODE');
  });
});
