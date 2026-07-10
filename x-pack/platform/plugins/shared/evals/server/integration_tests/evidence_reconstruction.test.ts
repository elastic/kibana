/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory, type ElasticsearchClient } from '@kbn/core/server';
import type { MockedVersionedRouter } from '@kbn/core-http-router-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServiceMock } from '@kbn/core/server/mocks';
import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { API_VERSIONS, EVALS_EVALUATE_URL, type EvaluateResponse } from '@kbn/evals-common';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { createEvaluatorRegistry } from '../evaluators/registry';
import type { GroundednessAnalysis } from '../evaluators/groundedness/types';
import { registerEvaluateRoute } from '../routes/evaluators/evaluate';

const logger = loggingSystemMock.createLogger();
const LOGS_INDEX = 'logs-evals-evidence-reconstruction-it';
const LOGS_BACKING_INDEX = 'evals-logs-evidence-reconstruction-it';
const TRACES_INDEX = 'traces-evals-evidence-reconstruction-it';

const ELASTIC_CONVENTION_TRACE_ID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const OTEL_EVENTS_TRACE_ID = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const OTEL_ATTRIBUTES_TRACE_ID = 'cccccccccccccccccccccccccccccccc';

const groundednessJudgeResponse: GroundednessAnalysis = {
  summary_verdict: 'GROUNDED',
  analysis: [
    {
      claim: 'The service is healthy.',
      centrality: 'central',
      centrality_reason: 'Directly answers the user question.',
      verdict: 'FULLY_SUPPORTED',
      evidence: {
        tool_call_id: 'call-1',
        tool_id: 'health_check',
        evidence_snippet: '{"status":"healthy"}',
      },
      explanation: 'Tool output supports the claim.',
    },
  ],
};

const cleanupEvidenceIndices = async (esClient: ElasticsearchClient) => {
  await esClient.indices
    .deleteAlias({
      index: LOGS_BACKING_INDEX,
      name: LOGS_INDEX,
    })
    .catch(() => {});
  await esClient.indices
    .delete({
      index: [LOGS_INDEX, TRACES_INDEX, LOGS_BACKING_INDEX],
      ignore_unavailable: true,
    })
    .catch(() => {});
};

const createEvidenceIndices = async (esClient: ElasticsearchClient) => {
  await esClient.indices.create({
    index: LOGS_BACKING_INDEX,
    mappings: {
      dynamic: true,
      dynamic_templates: [
        {
          strings_as_keywords: {
            match_mapping_type: 'string',
            mapping: { type: 'keyword' },
          },
        },
      ],
      properties: {
        '@timestamp': { type: 'date' },
      },
    },
  });
  await esClient.indices.putAlias({
    index: LOGS_BACKING_INDEX,
    name: LOGS_INDEX,
  });

  await esClient.indices.create({
    index: TRACES_INDEX,
    mappings: {
      dynamic: true,
      dynamic_templates: [
        {
          strings_as_keywords: {
            match_mapping_type: 'string',
            mapping: { type: 'keyword' },
          },
        },
      ],
      properties: {
        '@timestamp': { type: 'date' },
      },
    },
  });
};

const indexFixtures = async (esClient: ElasticsearchClient) => {
  const logsDocuments = [
    {
      // Real ES `_source` shape: a nested `attributes` object whose keys are
      // dotted (partially flattened OTLP attributes).
      trace_id: ELASTIC_CONVENTION_TRACE_ID,
      event_name: 'gen_ai.user.message',
      '@timestamp': '2026-07-10T09:00:00.000Z',
      attributes: { content: 'What is the payment status?' },
    },
    {
      trace_id: ELASTIC_CONVENTION_TRACE_ID,
      event_name: 'gen_ai.choice',
      '@timestamp': '2026-07-10T09:00:01.000Z',
      attributes: { 'message.content': 'The payment service is healthy.' },
    },
    {
      trace_id: OTEL_EVENTS_TRACE_ID,
      event_name: 'gen_ai.user.message',
      '@timestamp': '2026-07-10T09:01:00.000Z',
      body: { structured: { content: 'Summarize checkout errors.' } },
    },
    {
      trace_id: OTEL_EVENTS_TRACE_ID,
      event_name: 'gen_ai.choice',
      '@timestamp': '2026-07-10T09:01:02.000Z',
      // Keep default readiness checks satisfied while still forcing non-default mapping recommendation.
      attributes: { 'message.content': 'Fallback response for readiness only.' },
      body: {
        structured: { message: { content: 'There were 5 checkout errors in the last hour.' } },
      },
    },
    {
      // Set C intentionally has no attributes.content to validate unmapped-field handling.
      trace_id: OTEL_ATTRIBUTES_TRACE_ID,
      event_name: 'gen_ai.choice',
      '@timestamp': '2026-07-10T09:02:02.000Z',
      attributes: { 'message.content': 'Readiness response from logs.' },
    },
  ];

  const traceDocuments = [
    {
      // Real ES `_source` shape: nested `attributes` object with dotted keys.
      'trace.id': ELASTIC_CONVENTION_TRACE_ID,
      '@timestamp': '2026-07-10T09:00:00.500Z',
      attributes: {
        'elastic.inference.span.kind': 'TOOL',
        'gen_ai.tool.name': 'health_check',
        'gen_ai.tool.call.id': 'call-1',
        'gen_ai.tool.call.arguments': '{"service":"payments"}',
        'gen_ai.tool.call.result': '{"status":"healthy"}',
      },
    },
    {
      // Fully-nested attributes object, to prove nested paths still resolve.
      trace: { id: ELASTIC_CONVENTION_TRACE_ID },
      '@timestamp': '2026-07-10T09:00:00.600Z',
      attributes: {
        elastic: { inference: { span: { kind: 'TOOL' } } },
        gen_ai: {
          tool: {
            name: 'health_check',
            call: {
              id: 'call-1b',
              arguments: '{"service":"payments"}',
              result: '{"status":"healthy"}',
            },
          },
        },
      },
    },
    {
      'trace.id': OTEL_EVENTS_TRACE_ID,
      '@timestamp': '2026-07-10T09:01:00.500Z',
      attributes: {
        'gen_ai.operation.name': 'execute_tool',
        'gen_ai.tool.name': 'checkout_errors',
        'gen_ai.tool.call.id': 'call-2',
        'gen_ai.tool.call.arguments': '{"window":"1h"}',
        'gen_ai.tool.call.result': '{"count":5}',
      },
    },
    {
      'trace.id': OTEL_ATTRIBUTES_TRACE_ID,
      '@timestamp': '2026-07-10T09:02:00.000Z',
      attributes: {
        'gen_ai.input.messages': JSON.stringify([
          {
            role: 'user',
            parts: [{ type: 'text', content: 'How many deploy failures happened today?' }],
          },
        ]),
      },
    },
    {
      'trace.id': OTEL_ATTRIBUTES_TRACE_ID,
      '@timestamp': '2026-07-10T09:02:01.000Z',
      attributes: {
        'gen_ai.output.messages': JSON.stringify([
          {
            role: 'assistant',
            parts: [{ type: 'text', content: 'There were 3 deploy failures today.' }],
          },
        ]),
      },
    },
    {
      'trace.id': OTEL_ATTRIBUTES_TRACE_ID,
      '@timestamp': '2026-07-10T09:02:00.500Z',
      attributes: {
        'gen_ai.operation.name': 'execute_tool',
        'gen_ai.tool.name': 'deploy_failures',
        'gen_ai.tool.call.id': 'call-3',
        'gen_ai.tool.call.arguments': '{"window":"24h"}',
        'gen_ai.tool.call.result': '{"count":3}',
      },
    },
  ];

  await Promise.all(
    logsDocuments.map((document, index) =>
      esClient.index({
        index: LOGS_BACKING_INDEX,
        id: `log-${index}`,
        document,
      })
    )
  );
  await Promise.all(
    traceDocuments.map((document, index) =>
      esClient.index({
        index: TRACES_INDEX,
        id: `trace-${index}`,
        document,
      })
    )
  );

  await esClient.indices.refresh({ index: [LOGS_INDEX, TRACES_INDEX] });
};

describe('trace evidence reconstruction integration', () => {
  jest.setTimeout(180000);

  let manageES: TestElasticsearchUtils;
  let root: ReturnType<typeof createRootWithCorePlugins>;
  let esClient: ElasticsearchClient;

  const setupRoutes = () => {
    const router = httpServiceMock.createRouter();
    const versionedRouter = router.versioned as MockedVersionedRouter;
    const prompt = jest.fn().mockResolvedValue({
      toolCalls: [{ function: { arguments: groundednessJudgeResponse } }],
    });
    const inferenceStart: InferenceServerStart = {
      getClient: jest.fn().mockReturnValue({ prompt } as unknown as BoundInferenceClient),
    } as unknown as InferenceServerStart;

    const routeDependencies = {
      router,
      logger,
      canEncrypt: false,
      evaluatorRegistry: createEvaluatorRegistry(),
      getInferenceStart: async () => inferenceStart,
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
    };

    registerEvaluateRoute(routeDependencies);

    return {
      evaluateHandler: versionedRouter.getRoute('post', EVALS_EVALUATE_URL).versions[
        API_VERSIONS.internal.v1
      ].handler,
    };
  };

  const buildContext = () =>
    ({
      core: Promise.resolve({
        elasticsearch: {
          client: {
            asInternalUser: esClient,
          },
        },
      }),
    } as const);

  beforeAll(async () => {
    const { startES } = createTestServers({ adjustTimeout: jest.setTimeout });
    manageES = await startES();
    root = createRootWithCorePlugins({}, { oss: true });
    await root.preboot();
    await root.setup();
    const coreStart = await root.start();
    esClient = coreStart.elasticsearch.client.asInternalUser;
  });

  afterAll(async () => {
    await root?.shutdown().catch(() => {});
    await manageES?.stop().catch(() => {});
  });

  beforeEach(async () => {
    await cleanupEvidenceIndices(esClient);
    await createEvidenceIndices(esClient);
    await indexFixtures(esClient);
  });

  afterEach(async () => {
    await cleanupEvidenceIndices(esClient);
  });

  it('evaluates groundedness and code evaluators without unmapped-field search failures', async () => {
    const { evaluateHandler } = setupRoutes();
    const context = buildContext() as unknown as Parameters<typeof evaluateHandler>[0];

    const elasticResponse = await evaluateHandler(
      context,
      {
        body: {
          subject: { traces: [{ trace_id: ELASTIC_CONVENTION_TRACE_ID }] },
          evaluators: [{ name: 'groundedness', connector_id: 'connector-1' }, { name: 'latency' }],
        },
      } as unknown as Parameters<typeof evaluateHandler>[1],
      kibanaResponseFactory
    );
    const eventsResponse = await evaluateHandler(
      context,
      {
        body: {
          subject: {
            traces: [{ trace_id: OTEL_EVENTS_TRACE_ID }],
            evidence_mapping: { profile: 'otel-genai-events' },
          },
          evaluators: [{ name: 'groundedness', connector_id: 'connector-1' }, { name: 'latency' }],
        },
      } as unknown as Parameters<typeof evaluateHandler>[1],
      kibanaResponseFactory
    );
    const attributesResponse = await evaluateHandler(
      context,
      {
        body: {
          subject: {
            traces: [{ trace_id: OTEL_ATTRIBUTES_TRACE_ID }],
            evidence_mapping: { profile: 'otel-genai-attributes' },
          },
          evaluators: [{ name: 'groundedness', connector_id: 'connector-1' }, { name: 'latency' }],
        },
      } as unknown as Parameters<typeof evaluateHandler>[1],
      kibanaResponseFactory
    );

    expect(elasticResponse.status).toBe(200);
    expect(eventsResponse.status).toBe(200);
    expect(attributesResponse.status).toBe(200);

    const elasticResults = (elasticResponse.payload as EvaluateResponse).results;
    const eventsResults = (eventsResponse.payload as EvaluateResponse).results;
    const attributesResults = (attributesResponse.payload as EvaluateResponse).results;

    expect(elasticResults.map((result) => result.status)).toEqual(['ok', 'ok']);
    expect(eventsResults.map((result) => result.status)).toEqual(['ok', 'ok']);
    expect(attributesResults.map((result) => result.status)).toEqual(['ok', 'ok']);
    expect(
      [elasticResults, eventsResults, attributesResults].every(
        (results) => results[0]?.scores?.[0]?.label === 'GROUNDED'
      )
    ).toBe(true);
  });
});
