/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resources, tracing } from '@elastic/opentelemetry-node/sdk';
import { context, SpanStatusCode } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { HookLifecycle } from '@kbn/agent-builder-common';
import type { BeforeAgentHookContext, HooksServiceSetup } from '@kbn/agent-builder-server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import {
  initInferenceTracerProvider,
  shutdownInferenceTracerProvider,
  withActiveInferenceSpan,
} from '@kbn/inference-tracing';
import type { MemoryStorage } from '../storage/memory_storage';
import { resolveIdentity } from '../core/resolve_identity';
import { recallMemory, type RecalledMemory } from '../core/recall_memory';
import { registerMemoryHook } from './inject_memories';

jest.mock('../core/resolve_identity');
jest.mock('../core/recall_memory');

const mockResolveIdentity = jest.mocked(resolveIdentity);
const mockRecallMemory = jest.mocked(recallMemory);

const createMemory = (overrides: Partial<RecalledMemory> = {}): RecalledMemory => ({
  id: 'memory-1',
  title: 'Peer-reviewed sources',
  description: 'Prefer peer-reviewed sources for health claims.',
  created_at: '2026-08-13T12:00:00.000Z',
  author: 'user-1',
  author_kind: 'user',
  revision: 1,
  ...overrides,
});

describe('agent memory injection hook tracing', () => {
  let otelExporter: tracing.InMemorySpanExporter;
  let contextManager: AsyncLocalStorageContextManager;
  let security: ReturnType<typeof securityMock.createStart>;
  let handler: NonNullable<
    Parameters<HooksServiceSetup['register']>[0]['hooks'][HookLifecycle.beforeAgent]
  >['handler'];

  beforeAll(() => {
    contextManager = new AsyncLocalStorageContextManager();
    context.setGlobalContextManager(contextManager);
    contextManager.enable();
    otelExporter = new tracing.InMemorySpanExporter();
    const spanProcessor = new tracing.SimpleSpanProcessor(otelExporter);
    initInferenceTracerProvider({
      processors: [spanProcessor],
      resource: resources.defaultResource(),
    });
  });

  afterAll(async () => {
    await shutdownInferenceTracerProvider();
    contextManager.disable();
  });

  beforeEach(() => {
    otelExporter.reset();
    jest.clearAllMocks();

    const register = jest.fn<
      ReturnType<HooksServiceSetup['register']>,
      Parameters<HooksServiceSetup['register']>
    >();
    security = securityMock.createStart();
    security.authz.checkPrivilegesWithRequest.mockReturnValue({
      atSpace: jest.fn().mockResolvedValue({ hasAllRequested: true }),
    });
    mockResolveIdentity.mockReturnValue({
      author: 'user-1',
      author_kind: 'username',
    });

    registerMemoryHook({
      hooksSetup: { register },
      getStorage: jest.fn().mockReturnValue({} as MemoryStorage),
      getCurrentUserEsClient: jest.fn().mockReturnValue({} as ElasticsearchClient),
      getSecurity: () => security,
      getCoreSecurity: jest.fn().mockReturnValue({} as SecurityServiceStart),
      getSpaceId: jest.fn().mockReturnValue('default'),
      logger: loggingSystemMock.createLogger(),
    });

    const registration = register.mock.calls[0][0].hooks[HookLifecycle.beforeAgent];
    if (!registration) {
      throw new Error('beforeAgent hook was not registered');
    }
    handler = registration.handler;
  });

  const runHook = async (message = 'What sources should I use?') =>
    handler({
      request: httpServerMock.createKibanaRequest(),
      nextInput: { message, attachments: [] },
      agentId: 'test-agent',
    } satisfies BeforeAgentHookContext);

  const getHookSpan = () => {
    const span = otelExporter
      .getFinishedSpans()
      .find(({ name }) => name === 'agent_memory.before_agent.recall');
    if (!span) {
      throw new Error('memory hook span was not emitted');
    }
    return span;
  };

  it('records recalled memory count, ids, and estimated injection cost', async () => {
    mockRecallMemory.mockResolvedValue({
      memories: [createMemory(), createMemory({ id: 'memory-2' })],
    });

    const result = await withActiveInferenceSpan('invoke_agent', () => runHook());

    const attachmentContext = result?.nextInput?.attachment_context;
    const hookSpan = getHookSpan();
    const parentSpan = otelExporter.getFinishedSpans().find(({ name }) => name === 'invoke_agent');
    expect(hookSpan.parentSpanContext?.spanId).toBe(parentSpan?.spanContext().spanId);
    expect(attachmentContext).toBeDefined();
    expect(hookSpan.attributes).toEqual(
      expect.objectContaining({
        'agent_memory.recall.outcome': 'injected',
        'agent_memory.recall.memory_count': 2,
        'agent_memory.recall.memory_ids': ['memory-1', 'memory-2'],
        'agent_memory.injection.characters': attachmentContext?.length,
        'agent_memory.injection.estimated_tokens_per_llm_call': Math.ceil(
          (attachmentContext?.length ?? 0) / 4
        ),
      })
    );
  });

  it('records a zero-cost no-memory outcome', async () => {
    mockRecallMemory.mockResolvedValue({ memories: [] });

    await runHook();

    expect(getHookSpan().attributes).toEqual(
      expect.objectContaining({
        'agent_memory.recall.outcome': 'no_memories',
        'agent_memory.recall.memory_count': 0,
        'agent_memory.injection.characters': 0,
        'agent_memory.injection.estimated_tokens_per_llm_call': 0,
      })
    );
  });

  it('records when recall is skipped for missing privileges', async () => {
    security.authz.checkPrivilegesWithRequest.mockReturnValue({
      atSpace: jest.fn().mockResolvedValue({ hasAllRequested: false }),
    });

    await runHook();

    expect(mockRecallMemory).not.toHaveBeenCalled();
    expect(getHookSpan().attributes).toEqual(
      expect.objectContaining({
        'agent_memory.recall.outcome': 'skipped_no_privilege',
        'agent_memory.recall.memory_count': 0,
        'agent_memory.injection.characters': 0,
        'agent_memory.injection.estimated_tokens_per_llm_call': 0,
      })
    );
  });

  it('records fail-open errors without exposing recalled content', async () => {
    mockRecallMemory.mockRejectedValue(new Error('sensitive backend failure'));

    await expect(runHook()).resolves.toEqual({});

    const span = getHookSpan();
    expect(span.attributes).toEqual(
      expect.objectContaining({
        'agent_memory.recall.outcome': 'error',
        'agent_memory.recall.memory_count': 0,
        'agent_memory.injection.characters': 0,
        'agent_memory.injection.estimated_tokens_per_llm_call': 0,
      })
    );
    expect(span.status.code).toBe(SpanStatusCode.ERROR);
    expect(JSON.stringify(span.attributes)).not.toContain('sensitive backend failure');
    expect(JSON.stringify(span.attributes)).not.toContain('Peer-reviewed sources');
  });
});
