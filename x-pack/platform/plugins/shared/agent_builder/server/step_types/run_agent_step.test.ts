/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@elastic/schemas/es/tools/manifest.js', () => ({
  esManifest: [
    { id: 'indices.create' },
    { id: 'indices.delete' },
    { id: 'indices.update_aliases' },
    { id: 'bulk' },
  ],
}));

jest.mock('@elastic/schemas/kibana/tools/manifest.js', () => ({
  kibanaManifest: [{ id: 'alerting.delete-alerting-rule-id' }],
}));

import type { KibanaRequest } from '@kbn/core-http-server';
import { of, throwError } from 'rxjs';
import { z } from '@kbn/zod/v4';
import { ChatEventType, createRequestAbortedError } from '@kbn/agent-builder-common';
import {
  AGGREGATE_BY_REQUIRES_PLUGIN_ID_MESSAGE,
  ConfigSchema,
  EPHEMERAL_WITH_CREATE_CONVERSATION_MESSAGE,
  InputSchema,
  runAgentStepCommonDefinition,
} from '../../common/step_types/run_agent_step';
import {
  CONNECTOR_ID_BY_FEATURE_CONFLICT_MESSAGE_WORKFLOW,
  CONNECTOR_OR_INFERENCE_ID_CONFLICT_MESSAGE_WORKFLOW,
} from '../../common/resolve_connector_or_inference_id';
import { getRunAgentStepDefinition, parseMaxStepSize } from './run_agent_step';
import type { ServiceManager } from '../services';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';

describe('parseMaxStepSize', () => {
  it('parses byte units into bytes', () => {
    expect(parseMaxStepSize('1b')).toBe(1);
    expect(parseMaxStepSize('1kb')).toBe(1024);
    expect(parseMaxStepSize('1mb')).toBe(1024 ** 2);
    expect(parseMaxStepSize('10mb')).toBe(10 * 1024 ** 2);
    expect(parseMaxStepSize('1gb')).toBe(1024 ** 3);
  });

  it('is case-insensitive and tolerates surrounding whitespace', () => {
    expect(parseMaxStepSize('  10MB ')).toBe(10 * 1024 ** 2);
    expect(parseMaxStepSize('1GB')).toBe(1024 ** 3);
  });

  it('treats a bare number as a byte count', () => {
    expect(parseMaxStepSize('10')).toBe(10);
    expect(parseMaxStepSize('2048')).toBe(2048);
  });

  it('returns undefined for empty or malformed values', () => {
    expect(parseMaxStepSize('')).toBeUndefined();
    expect(parseMaxStepSize('   ')).toBeUndefined();
    expect(parseMaxStepSize('10tb')).toBeUndefined();
    expect(parseMaxStepSize('abc')).toBeUndefined();
    expect(parseMaxStepSize('mb')).toBeUndefined();
    expect(parseMaxStepSize('-5mb')).toBeUndefined();
    // Fractions and inner spaces are intentionally unsupported (ByteSizeValue semantics).
    expect(parseMaxStepSize('1.5kb')).toBeUndefined();
    expect(parseMaxStepSize('10 mb')).toBeUndefined();
  });
});

describe('ai.agent workflow step (Agent Builder)', () => {
  const createContext = (overrides: Partial<any> = {}) => {
    const fakeRequest = { headers: {} } as unknown as KibanaRequest;
    return {
      input: {},
      config: {},
      rawInput: {},
      contextManager: {
        getFakeRequest: jest.fn().mockReturnValue(fakeRequest),
        getContext: jest.fn().mockReturnValue({ execution: { id: 'exec-1' } }),
        getScopedEsClient: jest.fn(),
        renderInputTemplate: jest.fn(),
        callKibanaApi: jest.fn(),
      },
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
      abortSignal: new AbortController().signal,
      stepId: 'test-step',
      stepType: 'ai.agent',
      ...overrides,
    } as StepHandlerContext;
  };

  const createExecutionMock = (events$: any) => ({
    executeAgent: jest.fn().mockResolvedValue({ executionId: 'exec-1', events$ }),
  });

  it('creates and persists a conversation when create_conversation is true, and emits conversation_id', async () => {
    const events$ = of(
      {
        type: ChatEventType.conversationCreated,
        data: { conversation_id: 'c-1', title: 't' },
      },
      {
        type: ChatEventType.roundComplete,
        data: {
          round: {
            id: 'r-1',
            response: { message: 'ok', structured_output: { foo: 'bar' } },
          },
        },
      }
    );

    const execution = createExecutionMock(events$);

    const serviceManager = {
      internalStart: { execution },
    } as any;

    const step = getRunAgentStepDefinition(serviceManager);
    const context = createContext({
      input: {
        message: 'hello',
      },
      config: {
        'create-conversation': true,
      },
    });
    const res = await step.handler(context);

    expect(execution.executeAgent).toHaveBeenCalledTimes(1);
    expect(execution.executeAgent.mock.calls[0][0].params.accessControl).toBeUndefined();
    expect(res).toHaveProperty('output.conversation_id');
    expect(res.output?.conversation_id).toBe('c-1');
  });

  it('passes public access control when public-conversation is true', async () => {
    const events$ = of(
      {
        type: ChatEventType.conversationCreated,
        data: { conversation_id: 'c-public', title: 't' },
      },
      {
        type: ChatEventType.roundComplete,
        data: {
          round: {
            id: 'r-1',
            response: { message: 'ok' },
          },
        },
      }
    );

    const execution = createExecutionMock(events$);

    const serviceManager = {
      internalStart: { execution },
    } as any;

    const step = getRunAgentStepDefinition(serviceManager);
    const res = await step.handler(
      createContext({
        input: {
          message: 'hello',
        },
        config: {
          'create-conversation': true,
          'public-conversation': true,
        },
      })
    );

    expect(execution.executeAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          accessControl: { access_mode: 'public' },
          storeConversation: true,
          autoCreateConversationWithId: true,
        }),
      })
    );
    expect(res.output?.conversation_id).toBe('c-public');
  });

  it('uses conversation_id from input (with:) and create-conversation from config (static)', async () => {
    const events$ = of(
      {
        type: ChatEventType.conversationCreated,
        data: { conversation_id: 'c-dash', title: 't' },
      },
      {
        type: ChatEventType.roundComplete,
        data: {
          round: {
            id: 'r-1',
            response: { message: 'ok' },
          },
        },
      }
    );

    const execution = createExecutionMock(events$);

    const serviceManager = {
      internalStart: { execution },
    } as any;

    const step = getRunAgentStepDefinition(serviceManager);
    const res = await step.handler(
      createContext({
        input: {
          message: 'hello',
          conversation_id: 'c-dash',
        },
        config: {
          'create-conversation': true,
        },
      })
    );

    expect(execution.executeAgent).toHaveBeenCalledTimes(1);
    expect(res).toHaveProperty('output.conversation_id', 'c-dash');
  });

  it('reuses an existing conversation_id and updates it for follow-up prompts', async () => {
    const events$ = of(
      {
        type: ChatEventType.conversationUpdated,
        data: { conversation_id: 'c-1', title: 't' },
      },
      {
        type: ChatEventType.roundComplete,
        data: {
          round: {
            id: 'r-1',
            response: { message: 'ok' },
          },
        },
      }
    );

    const execution = createExecutionMock(events$);

    const serviceManager = {
      internalStart: { execution },
    } as any;

    const step = getRunAgentStepDefinition(serviceManager);
    const res = await step.handler(
      createContext({
        input: {
          message: 'follow up',
          conversation_id: 'c-1',
        },
      })
    );

    expect(execution.executeAgent).toHaveBeenCalledTimes(1);
    expect(res.output?.conversation_id).toBe('c-1');
  });

  it('does not create a conversation when create_conversation is false and no conversation_id is provided', async () => {
    const events$ = of({
      type: ChatEventType.roundComplete,
      data: {
        round: {
          id: 'r-1',
          response: { message: 'ok' },
        },
      },
    });

    const execution = createExecutionMock(events$);

    const serviceManager = {
      internalStart: { execution },
    } as any;

    const step = getRunAgentStepDefinition(serviceManager);
    const res = await step.handler(
      createContext({
        input: {
          message: 'stateless',
        },
      })
    );

    expect(execution.executeAgent).toHaveBeenCalledTimes(1);
    expect(res.output?.conversation_id).toBeUndefined();
  });

  it('propagates execution service errors (e.g., missing connector)', async () => {
    const execError = new Error('No LLM connector configured');
    const events$ = throwError(() => execError);

    const execution = createExecutionMock(events$);

    const serviceManager = {
      internalStart: { execution },
    } as any;

    const step = getRunAgentStepDefinition(serviceManager);
    const res = await step.handler(
      createContext({
        input: {
          message: 'hello',
        },
      })
    );

    expect(execution.executeAgent).toHaveBeenCalledTimes(1);
    expect(res.error).toBe(execError);
  });

  it('returns an error when no round_complete event is emitted', async () => {
    const events$ = of({
      type: ChatEventType.conversationCreated,
      data: { conversation_id: 'c-1', title: 't' },
    });

    const execution = createExecutionMock(events$);

    const serviceManager = {
      internalStart: { execution },
    } as any;

    const step = getRunAgentStepDefinition(serviceManager);
    const res = await step.handler(
      createContext({
        input: {
          message: 'hello',
        },
      })
    );

    expect(execution.executeAgent).toHaveBeenCalledTimes(1);
    expect(res.error).toBeInstanceOf(Error);
    expect(res.error?.message).toContain('No round_complete event');
  });

  it('fails when the workflow abort signal is already aborted', async () => {
    const events$ = throwError(() => createRequestAbortedError('Converse request was aborted'));

    const execution = createExecutionMock(events$);
    const abortController = new AbortController();
    abortController.abort();

    const serviceManager = {
      internalStart: { execution },
    } as any;

    const step = getRunAgentStepDefinition(serviceManager);
    const res = await step.handler(
      createContext({
        input: {
          message: 'hello',
        },
        abortSignal: abortController.signal,
      })
    );

    expect(execution.executeAgent).toHaveBeenCalledTimes(1);
    expect(res.error).toBeInstanceOf(Error);
    expect(res.error?.message).toContain('aborted');
  });

  it('propagates attachments to execution service nextInput', async () => {
    const attachments = [
      {
        id: 'attachment-1',
        type: 'security.alert',
        data: { alertId: 'alert-123', severity: 'high' },
      },
      {
        type: 'document',
        data: { content: 'test content' },
        hidden: true,
      },
    ];

    const events$ = of({
      type: ChatEventType.roundComplete,
      data: {
        round: {
          id: 'r-1',
          response: { message: 'ok' },
        },
      },
    });
    const execution = createExecutionMock(events$);

    const serviceManager = {
      internalStart: {
        execution,
      },
    } as any;

    const step = getRunAgentStepDefinition(serviceManager);
    const res = await step.handler(
      createContext({
        input: {
          message: 'hello',
          attachments,
        },
      })
    );

    expect(execution.executeAgent).toHaveBeenCalledTimes(1);
    expect(execution.executeAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          nextInput: {
            message: 'hello',
            attachments,
          },
        }),
      })
    );
    expect(res.output?.message).toBe('ok');
  });

  describe('approvals', () => {
    const runStep = async (input: Record<string, unknown>) => {
      const events$ = of({
        type: ChatEventType.roundComplete,
        data: { round: { id: 'r-1', response: { message: 'ok' } } },
      });
      const execution = createExecutionMock(events$);
      const serviceManager = { internalStart: { execution } } as any;

      const step = getRunAgentStepDefinition(serviceManager);
      await step.handler(createContext({ input }));

      return execution;
    };

    it('flattens the per-target map without ever enabling interactivity', async () => {
      const execution = await runStep({
        message: 'hello',
        approvals: {
          auto_approved_apis: {
            elasticsearch: ['indices.create', 'indices.update_aliases'],
            kibana: ['alerting.delete-alerting-rule-id'],
          },
        },
      });

      expect(execution.executeAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          interactive: {
            enabled: false,
            auto_approved_apis: [
              { target: 'elasticsearch', api: 'indices.create' },
              { target: 'elasticsearch', api: 'indices.update_aliases' },
              { target: 'kibana', api: 'alerting.delete-alerting-rule-id' },
            ],
          },
        })
      );
    });

    it.each<{ description: string; input: Record<string, unknown> }>([
      { description: 'omitted', input: { message: 'hello' } },
      { description: 'an empty object', input: { message: 'hello', approvals: {} } },
      {
        description: 'an empty map',
        input: { message: 'hello', approvals: { auto_approved_apis: {} } },
      },
      {
        description: 'an empty list for a target',
        input: { message: 'hello', approvals: { auto_approved_apis: { elasticsearch: [] } } },
      },
    ])(
      'runs non-interactively with no grants when the field is $description',
      async ({ input }) => {
        const execution = await runStep(input);

        expect(execution.executeAgent.mock.calls[0][0].interactive).toEqual({ enabled: false });
      }
    );

    it('emits a per-target selector enum, which is what drives editor autocomplete', () => {
      const jsonSchema = z.toJSONSchema(InputSchema, {
        unrepresentable: 'any',
        io: 'input',
      }) as Record<string, any>;

      const byTarget = jsonSchema.properties.approvals.properties.auto_approved_apis.properties;

      expect(byTarget.elasticsearch.items.enum).toContain('indices.create');
      expect(byTarget.elasticsearch.items.enum).not.toContain('alerting.delete-alerting-rule-id');
      expect(byTarget.kibana.items.enum).toContain('alerting.delete-alerting-rule-id');
      expect(byTarget.kibana.items.enum).not.toContain('indices.create');
    });

    it('offers the wildcards through that same enum', () => {
      const jsonSchema = z.toJSONSchema(InputSchema, {
        unrepresentable: 'any',
        io: 'input',
      }) as Record<string, any>;

      const byTarget = jsonSchema.properties.approvals.properties.auto_approved_apis.properties;

      expect(byTarget.elasticsearch.items.enum).toEqual(expect.arrayContaining(['*', 'indices.*']));
      expect(byTarget.kibana.items.enum).toEqual(expect.arrayContaining(['*', 'alerting.*']));
      expect(byTarget.kibana.items.enum).not.toContain('indices.*');
    });

    it('accepts a well-formed map, including wildcards', () => {
      const parsed = InputSchema.safeParse({
        message: 'hello',
        approvals: {
          auto_approved_apis: {
            elasticsearch: ['indices.create', 'indices.*', 'bulk', '*'],
            kibana: ['alerting.delete-alerting-rule-id', 'alerting.*'],
          },
        },
      });
      expect(parsed.success).toBe(true);
    });

    it.each<{ description: string; autoApprovedApis: unknown }>([
      {
        description: 'an identifier that names no real API',
        autoApprovedApis: { elasticsearch: ['indices.crate'] },
      },
      {
        description: 'an identifier that only exists on the other target',
        autoApprovedApis: { kibana: ['indices.create'] },
      },
      {
        description: 'a namespace wildcard that only exists on the other target',
        autoApprovedApis: { kibana: ['indices.*'] },
      },
      {
        description: 'a bare namespace instead of a full identifier or wildcard',
        autoApprovedApis: { elasticsearch: ['indices'] },
      },
      {
        description: 'a wildcard on an identifier that has no namespace',
        autoApprovedApis: { elasticsearch: ['bulk.*'] },
      },
      {
        description: 'an unknown target',
        autoApprovedApis: { postgres: ['indices.create'] },
      },
      {
        description: 'a flat list, which was the previous shape',
        autoApprovedApis: [{ target: 'elasticsearch', api: 'indices.create' }],
      },
      {
        description: 'a list exceeding 100 entries for one target',
        autoApprovedApis: {
          elasticsearch: Array.from({ length: 101 }, () => 'indices.create'),
        },
      },
    ])('rejects $description', ({ autoApprovedApis }) => {
      const parsed = InputSchema.safeParse({
        message: 'hello',
        approvals: { auto_approved_apis: autoApprovedApis },
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe('configuration_overrides (InputSchema)', () => {
    it('accepts configuration_overrides with all optional fields', () => {
      const parsed = InputSchema.safeParse({
        message: 'hello',
        configuration_overrides: {
          instructions: 'Custom instructions.',
          tools: [{ tool_ids: ['tool-a', 'tool-b'] }],
          skill_ids: ['skill-a'],
        },
      });
      expect(parsed.success).toBe(true);
    });

    it('accepts configuration_overrides with a subset of fields', () => {
      expect(
        InputSchema.safeParse({ message: 'hi', configuration_overrides: { skill_ids: ['s1'] } })
          .success
      ).toBe(true);
      expect(
        InputSchema.safeParse({
          message: 'hi',
          configuration_overrides: { instructions: 'override' },
        }).success
      ).toBe(true);
    });

    it('accepts an omitted configuration_overrides field', () => {
      const parsed = InputSchema.safeParse({ message: 'hello' });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.configuration_overrides).toBeUndefined();
      }
    });

    it('rejects instructions exceeding 2048 characters', () => {
      const parsed = InputSchema.safeParse({
        message: 'hello',
        configuration_overrides: { instructions: 'a'.repeat(2049) },
      });
      expect(parsed.success).toBe(false);
    });

    it('rejects skill_ids list exceeding 50 entries', () => {
      const parsed = InputSchema.safeParse({
        message: 'hello',
        configuration_overrides: { skill_ids: Array.from({ length: 51 }, (_, i) => `s-${i}`) },
      });
      expect(parsed.success).toBe(false);
    });

    it('rejects tools list exceeding 50 entries', () => {
      const parsed = InputSchema.safeParse({
        message: 'hello',
        configuration_overrides: {
          tools: Array.from({ length: 51 }, (_, i) => ({ tool_ids: [`t-${i}`] })),
        },
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe('connector-id / inference-id', () => {
    it('ConfigSchema rejects when both ids are meaningful', () => {
      const parsed = ConfigSchema.safeParse({
        'connector-id': 'a',
        'inference-id': 'b',
      });
      expect(parsed.success).toBe(false);
    });

    it('ConfigSchema accepts when connector-id is whitespace-only and inference-id is set', () => {
      const parsed = ConfigSchema.safeParse({
        'connector-id': '   ',
        'inference-id': 'b',
      });
      expect(parsed.success).toBe(true);
    });

    it('does not call executeAgent when both ids are meaningful (handler coalesce)', async () => {
      const events$ = of({
        type: ChatEventType.roundComplete,
        data: {
          round: {
            id: 'r-1',
            response: { message: 'ok' },
          },
        },
      });
      const execution = createExecutionMock(events$);
      const serviceManager = { internalStart: { execution } } as any;
      const step = getRunAgentStepDefinition(serviceManager);
      const res = await step.handler(
        createContext({
          input: { message: 'hello' },
          config: {
            'connector-id': 'a',
            'inference-id': 'b',
          },
        })
      );

      expect(execution.executeAgent).not.toHaveBeenCalled();
      expect(res.error?.message).toBe(CONNECTOR_OR_INFERENCE_ID_CONFLICT_MESSAGE_WORKFLOW);
    });

    it('passes trimmed inference-id as connectorId to executeAgent', async () => {
      const events$ = of({
        type: ChatEventType.roundComplete,
        data: {
          round: {
            id: 'r-1',
            response: { message: 'ok' },
          },
        },
      });
      const execution = createExecutionMock(events$);
      const serviceManager = { internalStart: { execution } } as any;
      const step = getRunAgentStepDefinition(serviceManager);
      await step.handler(
        createContext({
          input: { message: 'hello' },
          config: { 'inference-id': '  inf-1  ' },
        })
      );

      expect(execution.executeAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ connectorId: 'inf-1' }),
        })
      );
    });
  });

  describe('connector-id-by-feature', () => {
    const createFeatureServicesMock = (
      endpoints: Array<{ connectorId: string }> = [],
      feature?: { taskType: string }
    ) => ({
      searchInferenceEndpoints: {
        features: {
          get: jest.fn().mockReturnValue(feature),
        },
        endpoints: {
          getForFeature: jest
            .fn()
            .mockResolvedValue({ endpoints, warnings: [], soEntryFound: false }),
        },
      },
    });

    it('ConfigSchema rejects connector-id-by-feature combined with connector-id', () => {
      const parsed = ConfigSchema.safeParse({
        'connector-id': 'a',
        'connector-id-by-feature': 'my_feature',
      });
      expect(parsed.success).toBe(false);
    });

    it('ConfigSchema rejects connector-id-by-feature combined with inference-id', () => {
      const parsed = ConfigSchema.safeParse({
        'inference-id': 'a',
        'connector-id-by-feature': 'my_feature',
      });
      expect(parsed.success).toBe(false);
    });

    it('ConfigSchema accepts connector-id-by-feature alone', () => {
      const parsed = ConfigSchema.safeParse({ 'connector-id-by-feature': 'my_feature' });
      expect(parsed.success).toBe(true);
    });

    it('ConfigSchema accepts a feature list next to connector-id', () => {
      const parsed = ConfigSchema.safeParse({
        'connector-id': 'a',
        'connector-id-by-feature': ['alertzero_template_models', 'my_feature'],
      });
      expect(parsed.success).toBe(true);
    });

    it('uses the first configured feature ahead of the next id in the list', async () => {
      const events$ = of({
        type: ChatEventType.roundComplete,
        data: { round: { id: 'r-1', response: { message: 'ok' } } },
      });
      const execution = createExecutionMock(events$);
      const getForFeature = jest.fn().mockImplementation(async (featureId: string) => {
        if (featureId === 'alertzero_template_models') {
          return {
            endpoints: [{ connectorId: 'template-connector' }],
            warnings: [],
            soEntryFound: true,
          };
        }
        return {
          endpoints: [{ connectorId: 'tier-connector' }],
          warnings: [],
          soEntryFound: false,
        };
      });
      const serviceManager = {
        internalStart: {
          execution,
          searchInferenceEndpoints: {
            features: {
              get: jest.fn().mockReturnValue({ taskType: 'chat_completion' }),
            },
            endpoints: { getForFeature },
          },
        },
      } as any;

      const step = getRunAgentStepDefinition(serviceManager);
      await step.handler(
        createContext({
          input: { message: 'hello' },
          config: {
            'connector-id-by-feature': ['alertzero_template_models', 'alertzero_frontier'],
          },
        })
      );

      expect(execution.executeAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ connectorId: 'template-connector' }),
        })
      );
      expect(getForFeature).toHaveBeenCalledWith('alertzero_template_models', expect.anything(), {
        onlyReturnConfigured: true,
      });
      expect(getForFeature).not.toHaveBeenCalledWith(
        'alertzero_frontier',
        expect.anything(),
        expect.anything()
      );
    });

    it('falls through to connector-id when the listed feature has no configured model', async () => {
      const events$ = of({
        type: ChatEventType.roundComplete,
        data: { round: { id: 'r-1', response: { message: 'ok' } } },
      });
      const execution = createExecutionMock(events$);
      const getForFeature = jest.fn().mockResolvedValue({
        endpoints: [],
        warnings: [],
        soEntryFound: false,
      });
      const serviceManager = {
        internalStart: {
          execution,
          searchInferenceEndpoints: {
            features: {
              get: jest.fn().mockReturnValue({ taskType: 'chat_completion' }),
            },
            endpoints: { getForFeature },
          },
        },
      } as any;

      const step = getRunAgentStepDefinition(serviceManager);
      await step.handler(
        createContext({
          input: { message: 'hello' },
          config: {
            'connector-id': 'explicit-connector',
            'connector-id-by-feature': ['alertzero_template_models', '   '],
          },
        })
      );

      expect(execution.executeAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ connectorId: 'explicit-connector' }),
        })
      );
    });

    it('skips an unregistered template row and keeps the standalone connector', async () => {
      const events$ = of({
        type: ChatEventType.roundComplete,
        data: { round: { id: 'r-1', response: { message: 'ok' } } },
      });
      const execution = createExecutionMock(events$);
      const getForFeature = jest.fn();
      const serviceManager = {
        internalStart: {
          execution,
          searchInferenceEndpoints: {
            features: { get: jest.fn().mockReturnValue(undefined) },
            endpoints: { getForFeature },
          },
        },
      } as any;

      const step = getRunAgentStepDefinition(serviceManager);
      const res = await step.handler(
        createContext({
          input: { message: 'hello' },
          config: {
            'connector-id': 'standalone-connector',
            'connector-id-by-feature': ['alertzero_template_models'],
          },
        })
      );

      expect(res.error).toBeUndefined();
      expect(getForFeature).not.toHaveBeenCalled();
      expect(execution.executeAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ connectorId: 'standalone-connector' }),
        })
      );
    });

    it('resolves the connector from the feature and passes it to executeAgent', async () => {
      const events$ = of({
        type: ChatEventType.roundComplete,
        data: { round: { id: 'r-1', response: { message: 'ok' } } },
      });
      const execution = createExecutionMock(events$);
      const featureServices = createFeatureServicesMock([{ connectorId: 'feature-connector' }], {
        taskType: 'chat_completion',
      });
      const serviceManager = { internalStart: { execution, ...featureServices } } as any;

      const step = getRunAgentStepDefinition(serviceManager);
      await step.handler(
        createContext({
          input: { message: 'hello' },
          config: { 'connector-id-by-feature': 'significant_events_investigation' },
        })
      );

      expect(featureServices.searchInferenceEndpoints.endpoints.getForFeature).toHaveBeenCalledWith(
        'significant_events_investigation',
        expect.anything(),
        { onlyReturnConfigured: true }
      );
      expect(execution.executeAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ connectorId: 'feature-connector' }),
        })
      );
    });

    it('does not call executeAgent when connector-id-by-feature conflicts with connector-id at runtime', async () => {
      const events$ = of({
        type: ChatEventType.roundComplete,
        data: { round: { id: 'r-1', response: { message: 'ok' } } },
      });
      const execution = createExecutionMock(events$);
      const featureServices = createFeatureServicesMock([{ connectorId: 'feature-connector' }], {
        taskType: 'chat_completion',
      });
      const serviceManager = { internalStart: { execution, ...featureServices } } as any;

      const step = getRunAgentStepDefinition(serviceManager);
      const res = await step.handler(
        createContext({
          input: { message: 'hello' },
          config: {
            'connector-id': 'a',
            'connector-id-by-feature': 'my_feature',
          },
        })
      );

      expect(execution.executeAgent).not.toHaveBeenCalled();
      expect(res.error?.message).toBe(CONNECTOR_ID_BY_FEATURE_CONFLICT_MESSAGE_WORKFLOW);
    });

    it('continues without a feature connector when the feature resolves no endpoints', async () => {
      const events$ = of({
        type: ChatEventType.roundComplete,
        data: { round: { id: 'r-1', response: { message: 'ok' } } },
      });
      const execution = createExecutionMock(events$);
      const featureServices = createFeatureServicesMock([], { taskType: 'chat_completion' });
      const serviceManager = { internalStart: { execution, ...featureServices } } as any;

      const step = getRunAgentStepDefinition(serviceManager);
      const res = await step.handler(
        createContext({
          input: { message: 'hello' },
          config: { 'connector-id-by-feature': 'unknown_feature' },
        })
      );

      expect(res.error).toBeUndefined();
      expect(execution.executeAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ connectorId: undefined }),
        })
      );
    });

    it('surfaces an error when the feature is not a chat completion feature', async () => {
      const execution = createExecutionMock(of());
      const featureServices = createFeatureServicesMock([{ connectorId: 'feature-connector' }], {
        taskType: 'text_embedding',
      });
      const serviceManager = { internalStart: { execution, ...featureServices } } as any;

      const step = getRunAgentStepDefinition(serviceManager);
      const res = await step.handler(
        createContext({
          input: { message: 'hello' },
          config: { 'connector-id-by-feature': 'knowledge_base_embeddings' },
        })
      );

      expect(
        featureServices.searchInferenceEndpoints.endpoints.getForFeature
      ).not.toHaveBeenCalled();
      expect(execution.executeAgent).not.toHaveBeenCalled();
      expect(res.error?.message).toBe(
        'Feature "knowledge_base_embeddings" is not a chat completion feature (task type "text_embedding"). connector-id-by-feature requires a feature with task type "chat_completion".'
      );
    });
  });

  describe('ephemeral', () => {
    const roundOnly = () =>
      of({
        type: ChatEventType.roundComplete,
        data: { round: { id: 'r-1', response: { message: 'summary' } } },
      });

    it('loads the conversation without storing anything and omits conversation_id', async () => {
      const execution = createExecutionMock(roundOnly());
      const step = getRunAgentStepDefinition({ internalStart: { execution } } as any);

      const res = await step.handler(
        createContext({
          input: { message: 'Summarize', conversation_id: 'c-1' },
          config: { ephemeral: true },
        })
      );

      expect(execution.executeAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            conversationId: 'c-1',
            storeConversation: false,
            autoCreateConversationWithId: undefined,
          }),
        })
      );
      expect(res.error).toBeUndefined();
      expect(res.output?.message).toBe('summary');
      expect(res.output?.conversation_id).toBeUndefined();
    });

    it('runs a one-shot when no conversation_id is given', async () => {
      const execution = createExecutionMock(roundOnly());
      const step = getRunAgentStepDefinition({ internalStart: { execution } } as any);

      const res = await step.handler(
        createContext({ input: { message: 'Hello' }, config: { ephemeral: true } })
      );

      expect(execution.executeAgent.mock.calls[0][0].params.storeConversation).toBe(false);
      expect(res.output?.conversation_id).toBeUndefined();
    });

    it('still stores a conversation_id run when ephemeral is false', async () => {
      const execution = createExecutionMock(
        of(
          { type: ChatEventType.conversationUpdated, data: { conversation_id: 'c-1', title: 't' } },
          {
            type: ChatEventType.roundComplete,
            data: { round: { id: 'r-1', response: { message: 'ok' } } },
          }
        )
      );
      const step = getRunAgentStepDefinition({ internalStart: { execution } } as any);

      const res = await step.handler(
        createContext({
          input: { message: 'Hi', conversation_id: 'c-1' },
          config: { ephemeral: false },
        })
      );

      expect(execution.executeAgent.mock.calls[0][0].params.storeConversation).toBe(true);
      expect(res.output?.conversation_id).toBe('c-1');
    });

    it('ConfigSchema rejects ephemeral combined with create-conversation', () => {
      const parsed = ConfigSchema.safeParse({ 'create-conversation': true, ephemeral: true });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toBe(EPHEMERAL_WITH_CREATE_CONVERSATION_MESSAGE);
        expect(parsed.error.issues[0].path).toEqual(['ephemeral']);
      }
    });

    it('does not call executeAgent when ephemeral is combined with create-conversation at runtime', async () => {
      const execution = createExecutionMock(of());
      const serviceManager = { internalStart: { execution } } as any;

      const step = getRunAgentStepDefinition(serviceManager);
      const res = await step.handler(
        createContext({
          input: { message: 'hello' },
          config: { 'create-conversation': true, ephemeral: true },
        })
      );

      expect(execution.executeAgent).not.toHaveBeenCalled();
      expect(res.error?.message).toBe(EPHEMERAL_WITH_CREATE_CONVERSATION_MESSAGE);
    });

    it('ConfigSchema accepts ephemeral alone and with public-conversation', () => {
      expect(ConfigSchema.safeParse({ ephemeral: true }).success).toBe(true);
      expect(ConfigSchema.safeParse({ ephemeral: true, 'public-conversation': true }).success).toBe(
        true
      );
    });

    it('declares the key in the attached config schema', () => {
      expect(runAgentStepCommonDefinition.configSchema?.shape).toEqual(
        expect.objectContaining({ ephemeral: expect.anything() })
      );
    });
  });

  describe('telemetry attribution', () => {
    const roundCompleteEvents = () =>
      of({
        type: ChatEventType.roundComplete,
        data: {
          round: {
            id: 'r-1',
            response: { message: 'ok' },
          },
        },
      });

    it('ConfigSchema rejects aggregate-by without plugin-id', () => {
      const parsed = ConfigSchema.safeParse({ 'aggregate-by': 'streams_significant_events' });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toBe(AGGREGATE_BY_REQUIRES_PLUGIN_ID_MESSAGE);
      }
    });

    it('ConfigSchema accepts plugin-id with aggregate-by, and plugin-id alone', () => {
      expect(
        ConfigSchema.safeParse({
          'plugin-id': 'streams_significant_events_discovery',
          'aggregate-by': 'streams_significant_events',
        }).success
      ).toBe(true);
      expect(
        ConfigSchema.safeParse({ 'plugin-id': 'streams_significant_events_discovery' }).success
      ).toBe(true);
    });

    it('declares product attribution keys in the attached config schema', () => {
      expect(runAgentStepCommonDefinition.configSchema).toBeDefined();
      expect(runAgentStepCommonDefinition.configSchema?.shape).toEqual(
        expect.objectContaining({
          'product-solution': expect.anything(),
          'product-feature': expect.anything(),
        })
      );
    });

    it('forwards telemetry attribution to executeAgent', async () => {
      const execution = createExecutionMock(roundCompleteEvents());
      const serviceManager = { internalStart: { execution } } as any;
      const step = getRunAgentStepDefinition(serviceManager);

      await step.handler(
        createContext({
          input: { message: 'hello' },
          config: {
            'plugin-id': 'streams_significant_events_discovery',
            'aggregate-by': 'streams_significant_events',
            'product-solution': 'observability',
            'product-feature': 'nightshift',
          },
        })
      );

      expect(execution.executeAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            // No interactionId: the execution derives it from workflowExecutionId.
            telemetryMetadata: {
              pluginId: 'streams_significant_events_discovery',
              aggregateBy: 'streams_significant_events',
              productSolution: 'observability',
              productFeature: 'nightshift',
            },
            workflowExecutionId: 'exec-1',
          }),
        })
      );
    });

    it('ignores product attribution when no plugin-id is configured', async () => {
      const execution = createExecutionMock(roundCompleteEvents());
      const serviceManager = { internalStart: { execution } } as any;
      const step = getRunAgentStepDefinition(serviceManager);

      await step.handler(
        createContext({
          input: { message: 'hello' },
          config: {
            'product-solution': 'observability',
            'product-feature': 'nightshift',
          },
        })
      );

      const callArg = execution.executeAgent.mock.calls[0][0];
      expect(callArg.params).not.toHaveProperty('telemetryMetadata');
    });

    it('passes the workflow execution id for round telemetry and EIS, with or without a plugin-id', async () => {
      const execution = createExecutionMock(roundCompleteEvents());
      const serviceManager = { internalStart: { execution } } as any;
      const step = getRunAgentStepDefinition(serviceManager);

      await step.handler(createContext({ input: { message: 'hello' }, config: {} }));

      expect(execution.executeAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ workflowExecutionId: 'exec-1' }),
        })
      );
    });
  });

  describe('author attribution', () => {
    const roundCompleteEvents = () =>
      of({
        type: ChatEventType.roundComplete,
        data: {
          round: {
            id: 'r-1',
            response: { message: 'ok' },
          },
        },
      });

    const createServiceManager = (execution: ReturnType<typeof createExecutionMock>) =>
      ({ internalStart: { execution } } as unknown as ServiceManager);

    const runStep = async (input: Record<string, unknown>) => {
      const execution = createExecutionMock(roundCompleteEvents());
      const step = getRunAgentStepDefinition(createServiceManager(execution));

      await step.handler(createContext({ input, config: {} }));

      return execution.executeAgent.mock.calls[0][0].params;
    };

    it('passes a trimmed author_name as the author decoration', async () => {
      const params = await runStep({
        message: 'hello',
        author_name: '  Attack Discovery Review  ',
      });

      expect(params.author).toEqual({ full_name: 'Attack Discovery Review' });
    });

    it.each([
      { label: 'absent', input: { message: 'hello' } },
      { label: 'blank', input: { message: 'hello', author_name: '   ' } },
    ])('omits the author when author_name is $label', async ({ input }) => {
      const params = await runStep(input);

      expect(params).not.toHaveProperty('author');
    });

    it.each([
      { label: 'absent', authorName: undefined, success: true },
      { label: 'a name', authorName: 'Attack Discovery', success: true },
      { label: 'exactly 256 characters', authorName: 'a'.repeat(256), success: true },
      { label: 'empty', authorName: '', success: false },
      { label: 'blank', authorName: '   ', success: false },
      { label: '257 characters', authorName: 'a'.repeat(257), success: false },
    ])('author_name $label -> success $success', ({ authorName, success }) => {
      const input =
        authorName === undefined ? { message: 'x' } : { message: 'x', author_name: authorName };

      expect(InputSchema.safeParse(input).success).toBe(success);
    });
  });

  describe('metadata', () => {
    it('forwards input.metadata to executeAgent', async () => {
      const events$ = of({
        type: ChatEventType.roundComplete,
        data: { round: { id: 'r-1', response: { message: 'ok' } } },
      });
      const execution = createExecutionMock(events$);
      const serviceManager = { internalStart: { execution } } as any;
      const step = getRunAgentStepDefinition(serviceManager);

      await step.handler(
        createContext({
          input: { message: 'hello', metadata: { workflow_execution_id: 'wf-exec-1' } },
        })
      );

      expect(execution.executeAgent).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { workflow_execution_id: 'wf-exec-1' } })
      );
    });
  });

  describe('token usage', () => {
    it('includes usage in output from a single round with model_usage', async () => {
      const events$ = of({
        type: ChatEventType.roundComplete,
        data: {
          round: {
            id: 'r-1',
            response: { message: 'hello' },
            model_usage: {
              connector_id: 'c',
              llm_calls: 1,
              input_tokens: 100,
              output_tokens: 50,
              cached_input_tokens: 20,
            },
          },
        },
      });

      const execution = createExecutionMock(events$);
      const step = getRunAgentStepDefinition({ internalStart: { execution } } as any);

      const res = await step.handler(createContext({ input: { message: 'hi' } }));

      expect(res.output?.metadata?.usage).toEqual({
        connectorId: 'c',
        inputTokens: 100,
        outputTokens: 50,
        cachedTokens: 20,
        totalTokens: 150,
      });
    });

    it('accumulates token usage across multiple rounds', async () => {
      const events$ = of(
        {
          type: ChatEventType.roundComplete,
          data: {
            round: {
              id: 'r-1',
              response: { message: 'intermediate' },
              model_usage: {
                connector_id: 'c',
                llm_calls: 1,
                input_tokens: 200,
                output_tokens: 80,
                cached_input_tokens: 50,
              },
            },
          },
        },
        {
          type: ChatEventType.roundComplete,
          data: {
            round: {
              id: 'r-2',
              response: { message: 'final' },
              model_usage: {
                connector_id: 'c',
                llm_calls: 1,
                input_tokens: 300,
                output_tokens: 120,
                cached_input_tokens: 70,
              },
            },
          },
        }
      );

      const execution = createExecutionMock(events$);
      const step = getRunAgentStepDefinition({ internalStart: { execution } } as any);

      const res = await step.handler(createContext({ input: { message: 'hi' } }));

      // Output should be from the first round (events.find returns first match)
      expect(res.output?.message).toBe('intermediate');
      // Usage should be the sum across all rounds
      expect(res.output?.metadata?.usage).toEqual({
        connectorId: 'c',
        inputTokens: 500,
        outputTokens: 200,
        cachedTokens: 120,
        totalTokens: 700,
      });
    });

    it('returns zero usage when round has no model_usage', async () => {
      const events$ = of({
        type: ChatEventType.roundComplete,
        data: {
          round: {
            id: 'r-1',
            response: { message: 'ok' },
            // no model_usage
          },
        },
      });

      const execution = createExecutionMock(events$);
      const step = getRunAgentStepDefinition({ internalStart: { execution } } as any);

      const res = await step.handler(createContext({ input: { message: 'hi' } }));

      expect(res.output?.metadata?.usage).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
      });
    });

    it("does not tag a connector when the round reports the 'unknown' sentinel", async () => {
      // A round that made no LLM call reports connector_id: 'unknown'
      // (see add_round_complete_event.ts); it must not surface as a connector.
      const events$ = of({
        type: ChatEventType.roundComplete,
        data: {
          round: {
            id: 'r-1',
            response: { message: 'ok' },
            model_usage: {
              connector_id: 'unknown',
              llm_calls: 0,
              input_tokens: 10,
              output_tokens: 5,
            },
          },
        },
      });

      const execution = createExecutionMock(events$);
      const step = getRunAgentStepDefinition({ internalStart: { execution } } as any);

      const res = await step.handler(createContext({ input: { message: 'hi' } }));

      expect(res.output?.metadata?.usage).not.toHaveProperty('connectorId');
    });

    it('preserves partial token counts when the event stream errors mid-execution', async () => {
      const { concat, throwError: rxThrowError } =
        jest.requireActual<typeof import('rxjs')>('rxjs');

      // Cold observable: emits one round with tokens, then errors
      const events$ = concat(
        of({
          type: ChatEventType.roundComplete,
          data: {
            round: {
              id: 'r-1',
              response: { message: 'partial' },
              model_usage: {
                connector_id: 'c',
                llm_calls: 1,
                input_tokens: 150,
                output_tokens: 60,
                cached_input_tokens: 30,
              },
            },
          },
        }),
        rxThrowError(() => new Error('stream interrupted'))
      );

      const execution = createExecutionMock(events$);
      const step = getRunAgentStepDefinition({ internalStart: { execution } } as any);

      const res = await step.handler(createContext({ input: { message: 'hi' } }));

      expect(res.error).toBeInstanceOf(Error);
      // Partial token counts (and the resolved connector) are preserved in the
      // output despite the error.
      expect(res.output?.metadata?.usage).toEqual({
        connectorId: 'c',
        inputTokens: 150,
        outputTokens: 60,
        cachedTokens: 30,
        totalTokens: 210,
      });
    });
  });

  describe('prompt template', () => {
    const templateRequiredConnector = {
      connectorId: 'daybreak',
      metadata: { capabilities: { templates: { policy: 'required' } } },
    };
    const messagesConnector = { connectorId: 'default-llm', metadata: {} };

    const createInference = ({
      connector = templateRequiredConnector,
      content = '{"verdict":"false_positive","checks":[]}',
    }: {
      connector?: { connectorId: string; metadata: unknown };
      content?: string;
    } = {}) => {
      const chatComplete = jest.fn().mockResolvedValue({
        content,
        tokens: { prompt: 3, completion: 4, total: 7, cached: 1 },
      });
      const getConnectorById = jest.fn().mockResolvedValue(connector);
      const getDefaultConnector = jest.fn().mockResolvedValue(connector);
      return {
        chatComplete,
        getConnectorById,
        getDefaultConnector,
        inference: {
          getClient: () => ({ chatComplete, getConnectorById }),
          getDefaultConnector,
        },
      };
    };

    const templateInput = {
      message: 'judge this alert',
      template_id: '.attack-discovery-fp-tp',
      template_version: 1,
      template_variables: { cited_alerts: '[]' },
    };

    it('ignores template fields when the default connector accepts messages', async () => {
      const events$ = of({
        type: ChatEventType.roundComplete,
        data: { round: { id: 'r-1', response: { message: 'ok' } } },
      });
      const execution = createExecutionMock(events$);
      const { inference, chatComplete } = createInference({ connector: messagesConnector });
      const step = getRunAgentStepDefinition({
        internalStart: { execution, inference },
      } as any);

      await step.handler(createContext({ input: templateInput }));

      expect(chatComplete).not.toHaveBeenCalled();
      expect(execution.executeAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ connectorId: undefined }),
        })
      );
    });

    it('uses the default connector when that connector requires a template', async () => {
      const { inference, chatComplete } = createInference();
      const execution = createExecutionMock(of());
      const step = getRunAgentStepDefinition({
        internalStart: { execution, inference },
      } as any);

      const res = await step.handler(createContext({ input: templateInput }));

      expect(execution.executeAgent).not.toHaveBeenCalled();
      expect(chatComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: 'daybreak',
          template: expect.objectContaining({ id: '.attack-discovery-fp-tp', version: 1 }),
        })
      );
      expect(res.output?.message).toContain('false_positive');
    });

    it('sends the step attribution and the workflow execution id', async () => {
      const { inference, chatComplete } = createInference();
      const step = getRunAgentStepDefinition({
        internalStart: { execution: createExecutionMock(of()), inference },
      } as any);

      await step.handler(
        createContext({
          input: templateInput,
          config: {
            'connector-id': 'daybreak',
            'plugin-id': 'alertzero_fp_tp_analysis',
            'aggregate-by': 'alertzero_parent',
          },
        })
      );

      expect(chatComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            connectorTelemetry: expect.objectContaining({
              pluginId: 'alertzero_fp_tp_analysis',
              aggregateBy: 'alertzero_parent',
              interactionId: 'exec-1',
            }),
          },
        })
      );
    });

    it('rejects a template response that does not match the output schema', async () => {
      const { inference } = createInference({ content: '{"verdict":"false_positive"}' });
      const step = getRunAgentStepDefinition({
        internalStart: { execution: createExecutionMock(of()), inference },
      } as any);

      const res = await step.handler(
        createContext({
          input: {
            ...templateInput,
            schema: {
              type: 'object',
              required: ['checks'],
              properties: { checks: { type: 'array' }, verdict: { type: 'string' } },
            },
          },
          config: { 'connector-id': 'daybreak' },
        })
      );

      expect(res.error?.message).toContain('does not match the output schema');
    });

    it('stores a conversation when create-conversation is set', async () => {
      const { inference } = createInference({ content: 'plain answer' });
      const conversation = {
        id: 'c-template',
        agent_id: 'agent-builder',
        user: { id: 'user-1', username: 'user' },
      };
      const create = jest.fn().mockResolvedValue(conversation);
      const appendEvents = jest.fn().mockResolvedValue(conversation);
      const conversations = {
        getScopedClient: jest.fn().mockResolvedValue({ create, appendEvents, get: jest.fn() }),
      };
      const execution = createExecutionMock(of());
      const step = getRunAgentStepDefinition({
        internalStart: { execution, inference, conversations },
      } as any);

      const res = await step.handler(
        createContext({
          input: { ...templateInput, template_id: '.attack-discovery-fp-tp' },
          config: { 'connector-id': 'daybreak', 'create-conversation': true },
        })
      );

      expect(execution.executeAgent).not.toHaveBeenCalled();
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ agent_id: expect.any(String), rounds: [] }),
        { source: 'workflow' }
      );
      expect(appendEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'c-template',
          events: expect.arrayContaining([
            expect.objectContaining({
              type: 'user_message',
              data: { message: 'judge this alert' },
            }),
          ]),
        }),
        { source: 'workflow' }
      );
      expect(res.output?.conversation_id).toBe('c-template');
    });
  });
});
