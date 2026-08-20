/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

interface MockEvaluator {
  name: string;
  version: string;
  kind: 'llm' | 'code';
  origin: 'built_in' | 'user_defined';
  description: string;
  judge?: Record<string, unknown>;
  evidence_schema?: Record<string, unknown>;
}

const judge = {
  prompt: 'Rate {{{agent_response}}}',
  system_prompt: 'Judge only response quality.',
  evidence: ['response'],
  reference_data_keys: [],
  output: { scores: [{ name: 'quality', type: 'number' }] },
};

const createEvaluators = (): MockEvaluator[] => [
  {
    name: 'correctness',
    version: '1.0.0',
    kind: 'llm',
    origin: 'built_in',
    description: 'Checks whether a response is correct.',
    evidence_schema: { required: ['input', 'response'] },
  },
  {
    name: 'latency',
    version: '1.0.0',
    kind: 'code',
    origin: 'built_in',
    description: 'Measures trace latency.',
  },
  {
    name: 'quality',
    version: '1.0.0',
    kind: 'llm',
    origin: 'user_defined',
    description: 'Rates response quality.',
    judge,
    evidence_schema: { required: ['response'] },
  },
];

export const mockEvaluatorApis = async (page: ScoutPage): Promise<void> => {
  const evaluatorsBySpace = new Map<string, MockEvaluator[]>();
  const getEvaluators = (pathname: string): MockEvaluator[] => {
    const requestSpaceId = pathname.match(/\/s\/([^/]+)\//)?.[1];
    const pageSpaceId = new URL(page.url()).pathname.match(/\/s\/([^/]+)\//)?.[1];
    const spaceId = requestSpaceId ?? pageSpaceId ?? 'default';
    const evaluators = evaluatorsBySpace.get(spaceId) ?? createEvaluators();
    evaluatorsBySpace.set(spaceId, evaluators);
    return evaluators;
  };

  await page.route('**/api/actions/connectors', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'connector-1',
          name: 'Test connector',
          connector_type_id: '.gen-ai',
          is_deprecated: false,
          is_missing_secrets: false,
        },
      ]),
    });
  });

  await page.route('**/internal/evals/traces/_resolve_instrumentation*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profiles: [],
        recommended_instrumentation: { profile: 'elastic-inference' },
      }),
    });
  });

  await page.route('**/internal/evals/evaluators/_test*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        result: {
          status: 'error',
          evaluator: { name: 'quality', kind: 'llm' },
          error: { message: 'The trace does not contain the required response.' },
        },
      }),
    });
  });

  await page.route('**/internal/evals/evaluators/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const evaluatorPath = '/internal/evals/evaluators';
    const evaluatorPathIndex = url.pathname.indexOf(evaluatorPath);
    const pathSuffix = url.pathname.slice(evaluatorPathIndex + evaluatorPath.length);
    const name = pathSuffix.startsWith('/')
      ? decodeURIComponent(pathSuffix.slice(1).split('/')[0])
      : undefined;
    const evaluators = getEvaluators(url.pathname);

    if (name === '_test') {
      await route.fallback();
      return;
    }

    if (request.method() === 'GET' && name) {
      const evaluator = evaluators.find((candidate) => candidate.name === name);
      await route.fulfill({
        status: evaluator ? 200 : 404,
        contentType: 'application/json',
        body: JSON.stringify(
          evaluator ? { evaluator: { ...evaluator, versions: [evaluator.version] } } : {}
        ),
      });
      return;
    }

    if (request.method() === 'PUT' && name) {
      const evaluator = evaluators.find((candidate) => candidate.name === name);
      const body = request.postDataJSON() as {
        description: string;
        judge: Record<string, unknown>;
      };
      if (evaluator) {
        evaluator.description = body.description;
        evaluator.judge = body.judge;
        evaluator.version = '1.1.0';
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ evaluator }),
      });
      return;
    }

    if (request.method() === 'DELETE' && name) {
      const index = evaluators.findIndex((candidate) => candidate.name === name);
      if (index >= 0) {
        evaluators.splice(index, 1);
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ deleted: 1 }),
      });
      return;
    }

    await route.fallback();
  });

  await page.route('**/internal/evals/evaluators', async (route) => {
    const request = route.request();
    const evaluators = getEvaluators(new URL(request.url()).pathname);

    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ evaluators }),
      });
      return;
    }

    if (request.method() === 'POST') {
      const body = request.postDataJSON() as {
        name: string;
        description: string;
        judge: Record<string, unknown>;
      };
      const evaluator: MockEvaluator = {
        ...body,
        version: '1.0.0',
        kind: 'llm',
        origin: 'user_defined',
      };
      evaluators.push(evaluator);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ evaluator }),
      });
      return;
    }

    await route.fallback();
  });
};
