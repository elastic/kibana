/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Benchmarks Jev (OpenRouter Decisions API) against the fast model (Gemini 3.5 Flash Lite).
// Usage: node x-pack/platform/plugins/shared/agent_builder/benchmarks/decisions/run_decision_benchmark.mjs [runs=3]
// Reads the OpenRouter key from config/kibana.dev.yml and never prints it.

import { readFileSync, writeFileSync } from 'fs';
import { cases } from './decision_cases.mjs';

const RUNS = Number(process.argv[2] ?? 3);
// PROMPT=calibrated asks the fast model for calibrated probabilities per option; MODELS=fast_model runs one model.
const PROMPT = process.env.PROMPT ?? 'current';
const ONLY_MODELS = process.env.MODELS?.split(',');
const OUTPUT = process.env.OUTPUT ?? 'results.json';
const FAST_MODEL_OPENROUTER = 'google/gemini-3.5-flash-lite';
const JEV_MODEL = 'typesafe/jev-1.13';
const CALL_TIMEOUT_MS = 20000;

// The OpenRouter key, also when its block in kibana.dev.yml is commented out. Only the OpenRouter routes need it.
const apiKey =
  readFileSync(
    new URL('../../../../../../../config/kibana.dev.yml', import.meta.url),
    'utf8'
  ).match(/^[#\s]*apiKey:\s*(\S+)/m)?.[1] ?? '<no OpenRouter key>';

const ES_URL = 'http://localhost:9200';
const ES_AUTH = `Basic ${Buffer.from('elastic:changeme').toString('base64')}`;
const JEV_EIS_ID = '.typesafe-jev-1.13_decision';

// --- Jev through Elasticsearch (EIS), the request and parsing in providers/eis.ts ---

const askJevEis = async ({ input, name, question }) => {
  const response = await fetch(`${ES_URL}/_inference/decision/${JEV_EIS_ID}`, {
    method: 'POST',
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    headers: { 'Content-Type': 'application/json', Authorization: ES_AUTH },
    body: JSON.stringify({ input, task_settings: { questions: { [name]: question } } }),
  });
  const body = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new Error(
      `Elasticsearch ${response.status}: ${JSON.stringify(body?.error?.reason ?? body).slice(
        0,
        200
      )}`
    );
  }

  const answer = body?.decision?.answers?.[name];

  switch (question.type) {
    case 'predicate':
      return { answer: answer.probability >= 0.5, value: answer.probability };
    case 'choice':
      return { answer: answer.choice, value: answer.confidence };
    case 'score': {
      // Level probabilities come as [{ value, label, probability }]; take the most likely level.
      const [top] = [...answer.probabilities].sort((a, b) => b.probability - a.probability);
      return { answer: top.label, value: answer.confidence, score: answer.score };
    }
  }
};

// --- Jev through OpenRouter, the translation in providers/openrouter.ts ---

const toOpenRouterQuestion = (question) => {
  switch (question.type) {
    case 'predicate':
      return { type: 'noul', instructions: question.instructions };
    case 'choice':
      return {
        type: 'choice',
        instructions: question.instructions,
        criteria: Object.fromEntries(
          Object.entries(question.choices).map(([value, description]) => [
            value,
            description || null,
          ])
        ),
      };
    case 'score':
      return {
        type: 'score',
        instructions: question.instructions,
        criteria: question.levels.map(({ label, description }) =>
          description ? `${label}: ${description}` : label
        ),
      };
  }
};

const askJev = async ({ input, name, question }) => {
  const response = await fetch('https://openrouter.ai/api/alpha/decisions', {
    method: 'POST',
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: JEV_MODEL,
      state: input,
      questions: { [name]: toOpenRouterQuestion(question) },
      provider: { only: ['typesafe'], data_collection: 'deny', zdr: true },
    }),
  });
  const body = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new Error(
      `OpenRouter ${response.status}: ${body?.error?.message ?? response.statusText}`
    );
  }

  const answer = body?.answers?.[name];

  switch (question.type) {
    case 'predicate':
      return { answer: answer.noul >= 0.5, value: answer.noul };
    case 'choice':
      return { answer: answer.choice, value: answer.confidence };
    case 'score': {
      // Jev keys level probabilities by position; take the most likely level.
      const [position] = Object.entries(answer.probabilities).sort(([, a], [, b]) => b - a)[0];
      return { answer: question.levels[Number(position)].label, value: answer.confidence };
    }
  }
};

// --- Fast model through Elasticsearch, the prompt and schema in providers/fast_model.ts ---

const confidence = {
  type: 'number',
  minimum: 0,
  maximum: 1,
  description: 'How confident you are, from 0 to 1',
};

const answerSchema = (question) => {
  switch (question.type) {
    case 'predicate':
      return {
        type: 'object',
        properties: {
          probability: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Probability that the answer is yes, from 0 to 1',
          },
        },
        required: ['probability'],
      };
    case 'choice':
      return {
        type: 'object',
        properties: { choice: { type: 'string', enum: Object.keys(question.choices) }, confidence },
        required: ['choice', 'confidence'],
      };
    case 'score':
      return {
        type: 'object',
        properties: {
          level: { type: 'string', enum: question.levels.map(({ label }) => label) },
          confidence,
        },
        required: ['level', 'confidence'],
      };
  }
};

const describeQuestion = (name, question) => {
  switch (question.type) {
    case 'predicate':
      return `- ${name} (yes or no): ${question.instructions}`;
    case 'choice':
      return `- ${name} (pick one): ${question.instructions}\n${Object.entries(question.choices)
        .map(([value, description]) => `  - ${value}: ${description}`)
        .join('\n')}`;
    case 'score':
      return `- ${name} (pick a level): ${question.instructions}\n${question.levels
        .map(({ label, description }) => `  - ${label}: ${description}`)
        .join('\n')}`;
  }
};

// --- Calibrated variant: a probability per option, and rules for using the range ---

const CALIBRATION_RULES = `## How to give probabilities
- Probabilities say how likely each answer is to be right. They are used to decide whether to act on your answer, so a wrong answer with a high probability is worse than an honest middle value.
- Use the whole range. Go above 0.9 only when no reasonable reader would answer differently.
- When the input is ambiguous or two answers are both plausible, keep the top probability between 0.5 and 0.8 and give the runner-up the rest.
- For questions with options, give every option a probability; they add up to 1.`;

const probability = (description) => ({ type: 'number', minimum: 0, maximum: 1, description });

const calibratedAnswerSchema = (question) => {
  const perOption = (options) => ({
    type: 'object',
    properties: {
      probabilities: {
        type: 'object',
        properties: Object.fromEntries(
          options.map((option) => [
            option,
            probability(`Probability that "${option}" is the right answer`),
          ])
        ),
        required: options,
      },
    },
    required: ['probabilities'],
  });

  switch (question.type) {
    case 'predicate':
      return {
        type: 'object',
        properties: { probability: probability('Probability that the answer is yes, from 0 to 1') },
        required: ['probability'],
      };
    case 'choice':
      return perOption(Object.keys(question.choices));
    case 'score':
      return perOption(question.levels.map(({ label }) => label));
  }
};

const toCalibratedAnswer = (question, answer) => {
  if (question.type === 'predicate') {
    return { answer: answer.probability >= 0.5, value: answer.probability };
  }

  const [option, top] = Object.entries(answer.probabilities).sort(([, a], [, b]) => b - a)[0];

  return { answer: option, value: top, probabilities: answer.probabilities };
};

const systemPrompt = (name, question) =>
  PROMPT === 'calibrated'
    ? `You make quick decisions about an input for an automated system. Answer every question below about the input the user sends, by calling the 'decide' tool.\n\n${CALIBRATION_RULES}\n\n## Questions\n${describeQuestion(
        name,
        question
      )}`
    : `You make quick decisions about an input for an automated system. Answer every question below about the input the user sends, by calling the 'decide' tool.\n\n## Questions\n${describeQuestion(
        name,
        question
      )}`;

/** Builds the system prompt, tool and parse step shared by both fast-model routes. */
const fastModelRequest = ({ input, name, question }) => ({
  messages: [
    {
      role: 'system',
      content: systemPrompt(name, question),
    },
    { role: 'user', content: input },
  ],
  tools: [
    {
      type: 'function',
      function: {
        name: 'decide',
        description: 'Report the answers',
        parameters: {
          type: 'object',
          properties: {
            [name]:
              PROMPT === 'calibrated' ? calibratedAnswerSchema(question) : answerSchema(question),
          },
          required: [name],
        },
      },
    },
  ],
  tool_choice: { type: 'function', function: { name: 'decide' } },
});

const toFastModelAnswer = (question, answer) => {
  switch (question.type) {
    case 'predicate':
      return { answer: answer.probability >= 0.5, value: answer.probability };
    case 'choice':
      return { answer: answer.choice, value: answer.confidence };
    case 'score':
      return { answer: answer.level, value: answer.confidence };
  }
};

// EIS chat models answer 403 on the local cluster, so the fast model goes through OpenRouter's
// chat completions API instead: the same Gemini model, prompt and schema as providers/fast_model.ts.
const askFastModel = async ({ input, name, question }) => {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: FAST_MODEL_OPENROUTER,
      max_tokens: 512,
      ...fastModelRequest({ input, name, question }),
    }),
  });
  const body = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new Error(
      `OpenRouter ${response.status}: ${body?.error?.message ?? response.statusText}`
    );
  }

  const args = body?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;

  const parsed = JSON.parse(args)[name];

  return PROMPT === 'calibrated'
    ? toCalibratedAnswer(question, parsed)
    : toFastModelAnswer(question, parsed);
};

// --- Run ---

const models = Object.fromEntries(
  Object.entries({ jev: askJev, jev_eis: askJevEis, fast_model: askFastModel }).filter(
    ([model]) => !ONLY_MODELS || ONLY_MODELS.includes(model)
  )
);
const results = [];

for (const testCase of cases) {
  const [name, question] = testCase.question;

  for (const [model, ask] of Object.entries(models)) {
    for (let run = 1; run <= RUNS; run++) {
      const startedAt = performance.now();
      let outcome;

      try {
        outcome = await ask({ input: testCase.input, name, question });
      } catch (error) {
        outcome = { error: error.message.replaceAll(apiKey, '<key>') };
      }

      const latencyMs = Math.round(performance.now() - startedAt);
      const correct = outcome.error ? false : outcome.answer === testCase.expected;

      results.push({
        id: testCase.id,
        label: testCase.label,
        type: question.type,
        expected: testCase.expected,
        model,
        run,
        latencyMs,
        correct,
        ...outcome,
      });

      process.stdout.write(
        `${testCase.id} ${model} #${run}: ${
          outcome.error
            ? `ERROR ${outcome.error}`
            : `${outcome.answer} (${outcome.value?.toFixed?.(2)})`
        } ${correct ? 'ok' : 'WRONG'} ${latencyMs}ms\n`
      );
    }
  }
}

writeFileSync(new URL(`./${OUTPUT}`, import.meta.url), JSON.stringify(results, null, 2));
process.stdout.write(
  `\nWrote ${results.length} results to x-pack/platform/plugins/shared/agent_builder/benchmarks/decisions/${OUTPUT}\n`
);
