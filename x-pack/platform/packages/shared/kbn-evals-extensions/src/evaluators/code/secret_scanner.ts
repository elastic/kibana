/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';

interface SecretPattern {
  name: string;
  // `validate` exists so we can layer a cheap entropy / prefix check on top of
  // the regex to cut false positives (e.g. a 40-char hex string is not
  // automatically a secret — it also needs to look random).
  pattern: RegExp;
  validate?: (match: string) => boolean;
}

const MIN_ENTROPY = 3.5;

const shannonEntropy = (value: string): number => {
  const counts = new Map<string, number>();
  for (const ch of value) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let entropy = 0;
  const len = value.length;
  for (const count of counts.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
};

const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: 'aws-access-key',
    pattern: /\b(?:AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}\b/g,
  },
  {
    name: 'aws-secret-key',
    pattern:
      /(?:aws[_-]?(?:secret|sk)[_-]?(?:access[_-]?)?key)\s*[=:]\s*["']?([A-Za-z0-9/+=]{40})["']?/gi,
    validate: (m) => shannonEntropy(m) >= MIN_ENTROPY,
  },
  {
    name: 'github-pat',
    pattern: /\bghp_[A-Za-z0-9]{36,}\b/g,
  },
  {
    name: 'github-fine-grained',
    pattern: /\bgithub_pat_[A-Za-z0-9_]{82}\b/g,
  },
  {
    name: 'gitlab-pat',
    pattern: /\bglpat-[A-Za-z0-9_-]{20}\b/g,
  },
  {
    name: 'slack-token',
    pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g,
  },
  {
    name: 'slack-webhook',
    pattern: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/g,
  },
  {
    name: 'jwt',
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  },
  {
    name: 'google-api-key',
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
  {
    name: 'stripe-secret',
    pattern: /\bsk_(?:live|test)_[A-Za-z0-9]{24,}\b/g,
  },
  {
    name: 'openai-key',
    pattern: /\bsk-[A-Za-z0-9]{20,}\b/g,
    validate: (m) => shannonEntropy(m) >= MIN_ENTROPY,
  },
  {
    name: 'private-key-block',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g,
  },
  {
    name: 'elastic-api-key',
    // Elastic API keys are base64-encoded "id:api_key" pairs. We require the
    // value to be assigned to something that looks like an api-key field so
    // that raw base64 in docs/examples doesn't trip this.
    pattern:
      /(?:elastic[_-]?)?api[_-]?key\s*[=:]\s*["']?([A-Za-z0-9+/=_-]{40,})["']?/gi,
    validate: (m) => shannonEntropy(m) >= MIN_ENTROPY,
  },
  {
    name: 'generic-bearer',
    pattern: /\bBearer\s+[A-Za-z0-9_.\-+/=]{20,}\b/g,
    validate: (m) => shannonEntropy(m) >= MIN_ENTROPY,
  },
];

// Common false-positive anchors — skill markdown is expected to include example
// values; we don't want a placeholder like `API_KEY=<your-api-key>` to fail.
const PLACEHOLDER_PATTERNS: RegExp[] = [
  /<[^>]+>/, // <your-key>
  /\{[^}]+\}/, // {your_key}
  /\bexample\b/i,
  /\bplaceholder\b/i,
  /\bchangeme\b/i,
  /\bREDACTED\b/i,
  /\bXXXX+\b/i,
  /\.\.\./,
];

const isPlaceholder = (match: string): boolean =>
  PLACEHOLDER_PATTERNS.some((p) => p.test(match));

export const createSecretScannerEvaluator = (): Evaluator => ({
  name: 'skill-secret-scanner',
  kind: 'CODE',
  evaluate: async ({ output }) => {
    const content = typeof output === 'string' ? output : JSON.stringify(output);
    const findings: Array<{ type: string; match: string }> = [];

    for (const { name, pattern, validate } of SECRET_PATTERNS) {
      pattern.lastIndex = 0;
      let match = pattern.exec(content);
      while (match) {
        const value = match[0];
        if (!isPlaceholder(value) && (!validate || validate(value))) {
          // Truncate the match in the report so we don't re-leak the secret.
          const redacted =
            value.length > 8
              ? `${value.slice(0, 4)}…${value.slice(-2)}`
              : '***';
          findings.push({ type: name, match: redacted });
        }
        match = pattern.exec(content);
      }
    }

    if (findings.length === 0) {
      return {
        score: 1.0,
        label: 'pass',
        explanation: 'No hard-coded secrets detected',
      };
    }

    const grouped = findings.reduce((acc, f) => {
      acc[f.type] = (acc[f.type] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const summary = Object.entries(grouped)
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');

    return {
      score: 0.0,
      label: 'fail',
      explanation: `Found ${findings.length} potential secret(s): ${summary}. Remove or replace with placeholders.`,
      metadata: { findings, grouped },
    };
  },
});
