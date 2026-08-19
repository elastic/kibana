/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import type { MockedVersionedRouter } from '@kbn/core-http-router-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServiceMock } from '@kbn/core/server/mocks';
import {
  API_VERSIONS,
  EVALS_VALIDATE_URL,
  ValidateRequestBody,
  type ValidateResponse,
} from '@kbn/evals-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { z } from '@kbn/zod/v4';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { EvaluatorDefinition, EvaluatorRegistry } from '../../evaluators/types';
import { registerValidateRoute } from './validate';
import { buildSearchMock, hasTermFilter, withHits } from './test_helpers';

const FULL_TRACE_ID = '0af7651916cd43dd8448eb211c80319c';
const REDACTED_TRACE_ID = '0af7651916cd43dd8448eb211c80319d';

const buildRouteSearchMock = () =>
  buildSearchMock(async ({ index, filters, traceId, emptySearchResponse }) => {
    if (!traceId) {
      return emptySearchResponse;
    }

    if (traceId === FULL_TRACE_ID) {
      if (index === 'traces-*') {
        if (hasTermFilter(filters, 'attributes.elastic.inference.span.kind', 'LLM')) {
          return withHits([
            {
              '@timestamp': '2026-07-10T10:00:00.000Z',
              attributes: {
                'gen_ai.input.messages': JSON.stringify([
                  {
                    role: 'user',
                    parts: [{ type: 'text', content: 'What is the current payment status?' }],
                  },
                ]),
                'gen_ai.output.messages': JSON.stringify([
                  {
                    role: 'assistant',
                    parts: [{ type: 'text', content: 'Payments are healthy.' }],
                  },
                ]),
              },
            },
          ]);
        }
        if (hasTermFilter(filters, 'attributes.elastic.inference.span.kind', 'TOOL')) {
          return withHits([
            {
              '@timestamp': '2026-07-10T10:00:00.500Z',
              'attributes.gen_ai.tool.call.id': 'call-1',
              'attributes.gen_ai.tool.name': 'health_check',
              'attributes.gen_ai.tool.call.arguments': '{"service":"payments"}',
              'attributes.gen_ai.tool.call.result': '{"status":"healthy"}',
            },
          ]);
        }
      }
    }

    if (traceId === REDACTED_TRACE_ID) {
      if (index === 'traces-*') {
        if (hasTermFilter(filters, 'attributes.elastic.inference.span.kind', 'LLM')) {
          return withHits([
            {
              '@timestamp': '2026-07-10T11:00:00.000Z',
              attributes: {
                'gen_ai.input.messages': JSON.stringify([
                  {
                    role: 'user',
                    parts: [{ type: 'text', content: 'What is the current payment status?' }],
                  },
                ]),
              },
            },
            {
              '@timestamp': '2026-07-10T11:00:01.000Z',
              attributes: {
                'gen_ai.output.messages': JSON.stringify([
                  {
                    role: 'assistant',
                    parts: [{ type: 'text', content: '' }],
                  },
                ]),
              },
            },
          ]);
        }
        if (hasTermFilter(filters, 'attributes.elastic.inference.span.kind', 'TOOL')) {
          return withHits([
            {
              '@timestamp': '2026-07-10T11:00:00.500Z',
              'attributes.gen_ai.tool.call.id': 'call-2',
              'attributes.gen_ai.tool.name': 'health_check',
              'attributes.gen_ai.tool.call.arguments': '{"service":"payments"}',
              'attributes.gen_ai.tool.call.result': '{"status":"healthy"}',
            },
          ]);
        }
      }
    }

    return emptySearchResponse;
  });

describe('POST /internal/evals/evaluators/_validate', () => {
  const groundednessEvaluator: EvaluatorDefinition = {
    name: 'groundedness',
    version: '1.0.0',
    kind: 'llm',
    description: 'Groundedness evaluator',
    evidenceSchema: z.object({
      input: z.object({
        message: z.string().trim().min(1),
      }),
      response: z.object({
        message: z.string().trim().min(1),
      }),
      steps: z.array(z.object({}).catchall(z.unknown())),
    }),
    evaluate: jest.fn(),
  };

  const codeEvaluator: EvaluatorDefinition = {
    name: 'latency',
    version: '1.0.0',
    kind: 'code',
    description: 'Latency evaluator',
    evaluate: jest.fn(),
  };

  const evaluatorRegistry: EvaluatorRegistry = {
    list: () => [groundednessEvaluator, codeEvaluator],
    get: (name: string, version?: string) =>
      [groundednessEvaluator, codeEvaluator].find(
        (definition) =>
          definition.name === name && (version === undefined || definition.version === version)
      ),
  };

  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    const versionedRouter = router.versioned as MockedVersionedRouter;

    registerValidateRoute({
      router,
      logger,
      canEncrypt: false,
      evaluatorRegistry,
      getInferenceStart: async () => ({ getClient: jest.fn() } as unknown as InferenceServerStart),
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
    });

    const route = versionedRouter.getRoute('post', EVALS_VALIDATE_URL);
    const routeConfig = versionedRouter.post.mock.calls[0][0];
    const { handler } = route.versions[API_VERSIONS.internal.v1];

    return { handler, routeConfig };
  };

  const buildContext = (searchMock = buildRouteSearchMock()) =>
    ({
      core: Promise.resolve({
        elasticsearch: {
          client: {
            asInternalUser: {
              search: searchMock,
            },
          },
        },
      }),
    } as const);

  it('registers manage privilege authz requirement', () => {
    const { routeConfig } = setup();

    expect(routeConfig.security).toEqual({
      authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.manage] },
    });
  });

  it('marks all evaluators ready for complete evidence traces', async () => {
    const { handler } = setup();

    const response = await handler(
      buildContext() as unknown as Parameters<typeof handler>[0],
      {
        body: {
          subject: { traces: [{ trace_id: FULL_TRACE_ID }] },
          evaluators: [{ name: 'groundedness' }, { name: 'latency' }],
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      evaluators: [
        { name: 'groundedness', version: '1.0.0', ready: true, unmet: [] },
        { name: 'latency', version: '1.0.0', ready: true, unmet: [] },
      ],
    });
  });

  it('returns includeLlmResponses remediation for redacted response evidence', async () => {
    const { handler } = setup();

    const response = await handler(
      buildContext() as unknown as Parameters<typeof handler>[0],
      {
        body: {
          subject: { traces: [{ trace_id: REDACTED_TRACE_ID }] },
          evaluators: [{ name: 'groundedness' }],
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    const payload = response.payload as ValidateResponse;
    expect(payload.evaluators).toEqual([
      expect.objectContaining({
        name: 'groundedness',
        ready: false,
        remediation: 'enable includeLlmResponses',
      }),
    ]);
    expect(payload.evaluators[0].unmet).toContain('response.message');
  });

  it('marks evaluators without evidence schema as ready', async () => {
    const { handler } = setup();

    const response = await handler(
      buildContext() as unknown as Parameters<typeof handler>[0],
      {
        body: {
          subject: { traces: [{ trace_id: REDACTED_TRACE_ID }] },
          evaluators: [{ name: 'latency' }],
        },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      evaluators: [{ name: 'latency', version: '1.0.0', ready: true, unmet: [] }],
    });
  });

  it('rejects unknown instrumentation profiles at request validation', () => {
    const result = ValidateRequestBody.safeParse({
      subject: {
        traces: [{ trace_id: FULL_TRACE_ID }],
        instrumentation: { profile: 'unknown-profile' },
      },
      evaluators: [{ name: 'groundedness' }],
    });

    expect(result.success).toBe(false);
  });
});
