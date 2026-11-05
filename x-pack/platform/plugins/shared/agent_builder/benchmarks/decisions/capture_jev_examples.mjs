/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Captures raw Jev request/response pairs for the PR examples. The API key is never written out.
import { readFileSync, writeFileSync } from 'fs';
import { cases } from './decision_cases.mjs';

const apiKey = readFileSync(
  new URL('../../../../../../../config/kibana.dev.yml', import.meta.url),
  'utf8'
).match(/^[#\s]*apiKey:\s*(\S+)/m)[1];
const IDS = ['P1', 'P2', 'C1', 'C5', 'S2', 'S4'];

const toOpenRouterQuestion = (q) => {
  switch (q.type) {
    case 'predicate':
      return { type: 'noul', instructions: q.instructions };
    case 'choice':
      return {
        type: 'choice',
        instructions: q.instructions,
        criteria: Object.fromEntries(Object.entries(q.choices).map(([v, d]) => [v, d || null])),
      };
    case 'score':
      return {
        type: 'score',
        instructions: q.instructions,
        criteria: q.levels.map(({ label, description }) =>
          description ? `${label}: ${description}` : label
        ),
      };
  }
};

const examples = [];
for (const id of IDS) {
  const testCase = cases.find((c) => c.id === id);
  const [name, question] = testCase.question;
  const request = {
    model: 'typesafe/jev-1.13',
    state: testCase.input,
    questions: { [name]: toOpenRouterQuestion(question) },
    provider: { only: ['typesafe'], data_collection: 'deny', zdr: true },
  };
  const startedAt = performance.now();
  const response = await fetch('https://openrouter.ai/api/alpha/decisions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(request),
  });
  const body = await response.json();
  examples.push({
    id,
    label: testCase.label,
    expected: testCase.expected,
    status: response.status,
    latencyMs: Math.round(performance.now() - startedAt),
    request,
    response: body,
  });
  console.log(id, response.status, JSON.stringify(body).slice(0, 220));
}
writeFileSync(new URL('./jev_examples.json', import.meta.url), JSON.stringify(examples, null, 2));
