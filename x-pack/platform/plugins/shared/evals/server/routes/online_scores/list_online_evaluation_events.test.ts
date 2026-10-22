/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { MockedVersionedRouter } from '@kbn/core-http-router-server-mocks';
import {
  API_VERSIONS,
  EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS,
  EVALS_EVENTS_LOGS_INDEX_PATTERN,
  EVALS_ONLINE_EVALUATION_EVENTS_URL,
  GEN_AI_EVALUATION_RESULT_EVENT,
} from '@kbn/evals-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { EVALS_API_PRIVILEGES } from '../../../common';
import { createEvaluatorRegistry } from '../../evaluators/registry';
import { registerListOnlineEvaluationEventsRoute } from './list_online_evaluation_events';

const EVALUATED_TRACE_ID = '0123456789abcdef0123456789abcdef';
const EVALUATOR_TRACE_ID = 'fedcba9876543210fedcba9876543210';

describe('GET /internal/evals/online_evaluation_events', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    const getSpaceId = jest.fn().mockResolvedValue('space-a');
    registerListOnlineEvaluationEventsRoute({
      router,
      logger,
      canEncrypt: false,
      evaluatorRegistry: createEvaluatorRegistry(),
      getInferenceStart: async () => ({ getClient: jest.fn() } as unknown as InferenceServerStart),
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
      getSpaceId,
    });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const route = versionedRouter.getRoute('get', EVALS_ONLINE_EVALUATION_EVENTS_URL);
    const routeVersion = route.versions[API_VERSIONS.internal.v1];
    const search = jest.fn().mockResolvedValue({
      hits: { total: { value: 0, relation: 'eq' }, hits: [] },
    });
    const context = {
      core: Promise.resolve({
        elasticsearch: {
          client: {
            asInternalUser: { search },
          },
        },
      }),
    };

    return {
      context,
      getSpaceId,
      handler: routeVersion.handler,
      logger,
      routeConfig: route.config,
      search,
    };
  };

  const makeRequest = () =>
    httpServerMock.createKibanaRequest({
      method: 'get',
      path: EVALS_ONLINE_EVALUATION_EVENTS_URL,
      query: {
        monitor_id: 'workflow-1',
        page: 2,
        per_page: 25,
      },
    });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers the internal route with the read privilege', () => {
    const { routeConfig } = setup();

    expect(routeConfig).toMatchObject({
      access: 'internal',
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
    });
  });

  it('returns an empty page when no event index exists', async () => {
    const { context, getSpaceId, handler, search } = setup();
    const request = makeRequest();

    const response = await handler(
      context as unknown as Parameters<typeof handler>[0],
      request,
      kibanaResponseFactory
    );

    expect(search).toHaveBeenCalledWith({
      index: EVALS_EVENTS_LOGS_INDEX_PATTERN,
      ignore_unavailable: true,
      allow_no_indices: true,
      from: 25,
      size: 25,
      _source_excludes: [`attributes.${EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.SCORE_METADATA}`],
      track_total_hits: true,
      sort: [{ '@timestamp': { order: 'desc' } }],
      query: {
        bool: {
          filter: [
            { term: { event_name: GEN_AI_EVALUATION_RESULT_EVENT } },
            {
              term: {
                [`attributes.${EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.MONITOR_ID}`]: 'workflow-1',
              },
            },
            {
              term: {
                [`attributes.${EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.SPACE_ID}`]: 'space-a',
              },
            },
          ],
        },
      },
    });
    expect(getSpaceId).toHaveBeenCalledWith(request);
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ total: 0, data: [] });
  });

  it('maps event hits with and without evaluator trace ids', async () => {
    const { context, handler, search } = setup();
    const commonAttributes = {
      [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.MONITOR_ID]: 'workflow-1',
      [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.MONITOR_NAME]: 'Online Eval Workflow',
      [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.CONNECTOR_ID]: 'connector-1',
      [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATOR_NAME]: 'correctness',
      [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATOR_VERSION]: '1.0.0',
      [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATOR_KIND]: 'llm',
      [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.SCORE_LABEL]: 'pass',
      [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EXPLANATION]: 'The response is grounded.',
      [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.SCORE_METADATA]: '{"excluded":true}',
    };
    search.mockResolvedValueOnce({
      hits: {
        total: { value: 2, relation: 'eq' },
        hits: [
          {
            _source: {
              '@timestamp': 1783080000000,
              trace_id: EVALUATED_TRACE_ID,
              attributes: {
                ...commonAttributes,
                [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATOR_TRACE_ID]: EVALUATOR_TRACE_ID,
                [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATION_NAME]: 'factuality',
                [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.SCORE_VALUE]: 0.9,
              },
            },
          },
          {
            _source: {
              '@timestamp': '2026-07-03T11:59:00.000Z',
              trace_id: EVALUATED_TRACE_ID,
              attributes: {
                ...commonAttributes,
                [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATION_NAME]: 'relevance',
                [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.SCORE_VALUE]: 0.8,
              },
            },
          },
        ],
      },
    });

    const response = await handler(
      context as unknown as Parameters<typeof handler>[0],
      makeRequest(),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      total: 2,
      data: [
        {
          '@timestamp': '2026-07-03T12:00:00.000Z',
          trace_id: EVALUATED_TRACE_ID,
          monitor: { id: 'workflow-1', name: 'Online Eval Workflow' },
          connector_id: 'connector-1',
          evaluator: {
            name: 'correctness',
            version: '1.0.0',
            kind: 'llm',
            trace_id: EVALUATOR_TRACE_ID,
          },
          score: {
            name: 'factuality',
            value: 0.9,
            label: 'pass',
            explanation: 'The response is grounded.',
          },
        },
        {
          '@timestamp': '2026-07-03T11:59:00.000Z',
          trace_id: EVALUATED_TRACE_ID,
          monitor: { id: 'workflow-1', name: 'Online Eval Workflow' },
          connector_id: 'connector-1',
          evaluator: {
            name: 'correctness',
            version: '1.0.0',
            kind: 'llm',
          },
          score: {
            name: 'relevance',
            value: 0.8,
            label: 'pass',
            explanation: 'The response is grounded.',
          },
        },
      ],
    });
  });

  it('returns 500 when Elasticsearch throws', async () => {
    const { context, handler, logger, search } = setup();
    search.mockRejectedValueOnce(new Error('es failure'));

    const response = await handler(
      context as unknown as Parameters<typeof handler>[0],
      makeRequest(),
      kibanaResponseFactory
    );

    expect(response.status).toBe(500);
    expect(response.payload).toEqual({ message: 'Failed to list online evaluation events' });
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to list online evaluation events: es failure',
      expect.objectContaining({
        error: expect.objectContaining({ message: 'es failure', stack_trace: expect.any(String) }),
      })
    );
  });
});
