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
  EVALS_RESOLVE_MAPPINGS_URL,
  type ResolveMappingsResponse,
} from '@kbn/evals-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { EvaluatorRegistry } from '../../evaluators/types';
import { registerResolveMappingsRoute } from './resolve_mappings';

interface SearchRequest {
  index?: string | string[];
  query?: {
    bool?: {
      filter?: Array<Record<string, unknown>>;
    };
  };
}

const ELASTIC_TRACE_ID = '0af7651916cd43dd8448eb211c80319c';
const ATTR_TRACE_ID = '0af7651916cd43dd8448eb211c80319d';
const REDACTED_TRACE_ID = '0af7651916cd43dd8448eb211c80319e';
const ABSENT_TRACE_ID = '0af7651916cd43dd8448eb211c80319f';

const emptySearchResponse = { hits: { hits: [] } };

const withHits = (documents: Array<Record<string, unknown>>) => ({
  hits: {
    hits: documents.map((document) => ({ _source: document })),
  },
});

const getFilters = (request: SearchRequest): Array<Record<string, unknown>> =>
  request.query?.bool?.filter ?? [];

const getFilterTraceId = (filters: Array<Record<string, unknown>>): string | undefined => {
  for (const filter of filters) {
    const termFilter = filter.term as Record<string, unknown> | undefined;
    if (!termFilter) {
      continue;
    }

    const traceFromLogs = termFilter.trace_id;
    if (typeof traceFromLogs === 'string') {
      return traceFromLogs;
    }

    const traceFromTraces = termFilter['trace.id'];
    if (typeof traceFromTraces === 'string') {
      return traceFromTraces;
    }
  }

  return undefined;
};

const hasTermFilter = (
  filters: Array<Record<string, unknown>>,
  field: string,
  expectedValue: string
): boolean =>
  filters.some((filter) => {
    const termFilter = filter.term as Record<string, unknown> | undefined;
    return termFilter?.[field] === expectedValue;
  });

const hasExistsFilter = (filters: Array<Record<string, unknown>>, field: string): boolean =>
  filters.some((filter) => {
    const existsFilter = filter.exists as Record<string, unknown> | undefined;
    return existsFilter?.field === field;
  });

const buildSearchMock = () =>
  jest.fn(async (request: SearchRequest) => {
    const index = Array.isArray(request.index) ? request.index[0] : request.index;
    const filters = getFilters(request);
    const traceId = getFilterTraceId(filters);

    if (!traceId || traceId === ABSENT_TRACE_ID) {
      return emptySearchResponse;
    }

    if (traceId === ELASTIC_TRACE_ID) {
      if (index === 'logs-*') {
        if (hasTermFilter(filters, 'event_name', 'gen_ai.user.message')) {
          return withHits([
            {
              '@timestamp': '2026-07-10T10:00:00.000Z',
              'attributes.content': 'What is the current payment status?',
            },
          ]);
        }
        if (hasTermFilter(filters, 'event_name', 'gen_ai.choice')) {
          return withHits([
            {
              '@timestamp': '2026-07-10T10:00:01.000Z',
              'attributes.message.content': 'Payments are healthy.',
            },
          ]);
        }
        return withHits([{ '@timestamp': '2026-07-10T10:00:00.000Z' }]);
      }

      if (index === 'traces-*') {
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
        return withHits([{ '@timestamp': '2026-07-10T10:00:00.500Z' }]);
      }
    }

    if (traceId === ATTR_TRACE_ID) {
      if (index === 'traces-*') {
        if (hasExistsFilter(filters, 'attributes.gen_ai.input.messages')) {
          return withHits([
            {
              '@timestamp': '2026-07-10T10:10:00.000Z',
              'attributes.gen_ai.input.messages': JSON.stringify([
                {
                  role: 'user',
                  parts: [{ type: 'text', content: 'Summarize failures in last 24h.' }],
                },
              ]),
            },
          ]);
        }
        if (hasExistsFilter(filters, 'attributes.gen_ai.output.messages')) {
          return withHits([
            {
              '@timestamp': '2026-07-10T10:10:01.000Z',
              'attributes.gen_ai.output.messages': [
                {
                  role: 'assistant',
                  parts: [{ type: 'text', content: 'There were 12 failures in the last 24h.' }],
                },
              ],
            },
          ]);
        }
        if (hasTermFilter(filters, 'attributes.gen_ai.operation.name', 'execute_tool')) {
          return withHits([
            {
              '@timestamp': '2026-07-10T10:10:00.500Z',
              'attributes.gen_ai.tool.call.id': 'call-2',
              'attributes.gen_ai.tool.name': 'failure_summary',
              'attributes.gen_ai.tool.call.arguments': '{"window":"24h"}',
              'attributes.gen_ai.tool.call.result': '{"count":12}',
            },
          ]);
        }

        return withHits([{ '@timestamp': '2026-07-10T10:10:00.000Z' }]);
      }
    }

    if (traceId === REDACTED_TRACE_ID) {
      if (index === 'logs-*') {
        if (
          hasTermFilter(filters, 'event_name', 'gen_ai.user.message') ||
          hasTermFilter(filters, 'event_name', 'gen_ai.choice')
        ) {
          return withHits([{ '@timestamp': '2026-07-10T11:00:00.000Z' }]);
        }
        return withHits([{ '@timestamp': '2026-07-10T11:00:00.000Z' }]);
      }

      if (index === 'traces-*') {
        if (hasTermFilter(filters, 'attributes.elastic.inference.span.kind', 'TOOL')) {
          return withHits([{ '@timestamp': '2026-07-10T11:00:00.500Z' }]);
        }
        return withHits([{ '@timestamp': '2026-07-10T11:00:00.500Z' }]);
      }
    }

    return emptySearchResponse;
  });

describe('POST /internal/evals/traces/_resolve_mappings', () => {
  const evaluatorRegistry: EvaluatorRegistry = {
    list: () => [],
    get: () => undefined,
  };

  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    const versionedRouter = router.versioned as MockedVersionedRouter;

    registerResolveMappingsRoute({
      router,
      logger,
      canEncrypt: false,
      evaluatorRegistry,
      getInferenceStart: async () => ({ getClient: jest.fn() } as unknown as InferenceServerStart),
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
    });

    const route = versionedRouter.getRoute('post', EVALS_RESOLVE_MAPPINGS_URL);
    const routeConfig = versionedRouter.post.mock.calls[0][0];
    const { handler } = route.versions[API_VERSIONS.internal.v1];

    return { handler, routeConfig };
  };

  const buildContext = (searchMock = buildSearchMock()) =>
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

  it('recommends elastic-inference for elastic-convention traces', async () => {
    const { handler } = setup();

    const response = await handler(
      buildContext() as unknown as Parameters<typeof handler>[0],
      {
        body: { trace_id: ELASTIC_TRACE_ID },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    const payload = response.payload as ResolveMappingsResponse;
    expect(payload.recommended_mapping).toEqual({ profile: 'elastic-inference' });
    expect(payload.profiles).toContainEqual(
      expect.objectContaining({
        profile: 'elastic-inference',
        evidence: expect.objectContaining({
          user_query: expect.objectContaining({ status: 'found' }),
          agent_response: expect.objectContaining({ status: 'found' }),
          tool_calls: expect.objectContaining({ status: 'found' }),
        }),
      })
    );
  });

  it('recommends otel-genai-attributes for span-attribute traces', async () => {
    const { handler } = setup();

    const response = await handler(
      buildContext() as unknown as Parameters<typeof handler>[0],
      {
        body: { trace_id: ATTR_TRACE_ID },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    const payload = response.payload as ResolveMappingsResponse;
    expect(payload.recommended_mapping).toEqual({ profile: 'otel-genai-attributes' });
    expect(payload.profiles).toContainEqual(
      expect.objectContaining({
        profile: 'otel-genai-attributes',
        evidence: expect.objectContaining({
          user_query: expect.objectContaining({ status: 'found' }),
          agent_response: expect.objectContaining({ status: 'found' }),
          tool_calls: expect.objectContaining({ status: 'found' }),
        }),
      })
    );
  });

  it('returns content_redacted statuses with no recommended mapping for redacted traces', async () => {
    const { handler } = setup();

    const response = await handler(
      buildContext() as unknown as Parameters<typeof handler>[0],
      {
        body: { trace_id: REDACTED_TRACE_ID },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    const payload = response.payload as ResolveMappingsResponse;
    expect(payload.recommended_mapping).toBeNull();
    expect(payload.profiles).toContainEqual(
      expect.objectContaining({
        profile: 'elastic-inference',
        evidence: {
          user_query: expect.objectContaining({ status: 'content_redacted' }),
          agent_response: expect.objectContaining({ status: 'content_redacted' }),
          tool_calls: expect.objectContaining({ status: 'content_redacted' }),
        },
      })
    );
  });

  it('returns 404 when the trace has no indexed logs or spans', async () => {
    const { handler } = setup();

    const response = await handler(
      buildContext() as unknown as Parameters<typeof handler>[0],
      {
        body: { trace_id: ABSENT_TRACE_ID },
      } as unknown as Parameters<typeof handler>[1],
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
    expect(response.payload).toEqual({
      message: `Error: Trace ${ABSENT_TRACE_ID} is not ready: no documents indexed in traces-* or logs-* yet`,
    });
  });
});
