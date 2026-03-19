#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { readFileSync } = require('fs');
const path = require('path');

const suiteId = process.argv[2] || process.env.EVAL_SUITE_ID || '';
if (!suiteId) {
  console.error('Suite id is required (arg 1 or EVAL_SUITE_ID)');
  process.exit(1);
}

const suitesPath = path.resolve(__dirname, '../../evals.suites.json');
const raw = readFileSync(suitesPath, 'utf8');
const parsed = JSON.parse(raw);
const suites = Array.isArray(parsed?.suites) ? parsed.suites : [];

const suite = suites.find((s) => s?.id === suiteId) ?? null;
if (!suite) {
  process.stdout.write(JSON.stringify({ id: suiteId }));
  process.exit(0);
}

process.stdout.write(
  JSON.stringify({
    id: suite.id,
    name: suite.name,
    slackChannel: suite.slackChannel,
  })
);
