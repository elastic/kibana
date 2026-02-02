/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AIMessage, ToolMessage } from '@langchain/core/messages';
import { isAIMessage, isHumanMessage } from '@langchain/core/messages';
import type { ToolCallStep, ToolCallWithResult } from '@kbn/agent-builder-common';
import { ConversationRoundStatus, ConversationRoundStepType } from '@kbn/agent-builder-common';
import { sanitizeToolId } from '@kbn/agent-builder-genai-utils/langchain';
import {
  conversationToLangchainMessages,
  createFilestoreResultTransformer,
  FILE_REFERENCE_TOKEN_THRESHOLD,
} from './to_langchain_messages';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { IFileStore } from '@kbn/agent-builder-server/runner/filestore';
import type { FileEntry } from '@kbn/agent-builder-server/runner/filestore';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type {
  ProcessedAttachment,
  ProcessedConversation,
  ProcessedConversationRound,
  ProcessedRoundInput,
} from './prepare_conversation';

describe('conversationLangchainMessages', () => {
  const now = new Date().toISOString();

  const makeRoundInput = (
    message: string,
    attachments: ProcessedAttachment[] = []
  ): ProcessedRoundInput => ({
    message,
    attachments,
  });
  const makeAssistantResponse = (message: string) => ({ message });
  const makeToolCallWithResult = (
    id: string,
    toolId: string,
    params: any,
    results: ToolResult[]
  ): ToolCallWithResult => ({
    tool_call_id: id,
    tool_id: toolId,
    params,
    results,
  });
  const makeToolCallStep = (toolCall: ToolCallWithResult): ToolCallStep => ({
    ...toolCall,
    type: ConversationRoundStepType.toolCall,
  });
  const makeProcessedAttachment = (
    id: string,
    type: string,
    data: any,
    representationValue: string
  ): ProcessedAttachment => ({
    attachment: {
      id,
      type,
      data,
    },
    representation: {
      type: 'text',
      value: representationValue,
    },
    tools: [],
  });

  const createConversation = (
    parts: Partial<ProcessedConversation> = {}
  ): ProcessedConversation => {
    return {
      nextInput: { message: '', attachments: [] },
      previousRounds: [],
      attachments: [],
      attachmentTypes: [],
      attachmentStateManager: createAttachmentStateManager([], {
        getTypeDefinition: (type: string) =>
          ({
            id: type,
            validate: (input: unknown) => ({ valid: true, data: input }),
            format: () => ({ getRepresentation: () => ({ type: 'text', value: '' }) }),
          } as any),
      }),
      ...parts,
    };
  };

  const createRound = (
    parts: Partial<ProcessedConversationRound> = {}
  ): ProcessedConversationRound => {
    return {
      id: 'round-1',
      status: ConversationRoundStatus.completed,
      input: {
        message: '',
        attachments: [],
      },
      steps: [],
      response: {
        message: 'Response',
      },
      started_at: new Date().toISOString(),
      time_to_first_token: 0,
      time_to_last_token: 0,
      model_usage: {
        connector_id: 'unknown',
        llm_calls: 1,
        input_tokens: 12,
        output_tokens: 42,
      },
      ...parts,
    };
  };

  it('returns only the user message if no previous rounds', async () => {
    const nextInput = makeRoundInput('hello');
    const result = await conversationToLangchainMessages({
      conversation: createConversation({ nextInput }),
    });
    expect(result).toHaveLength(1);
    expect(isHumanMessage(result[0])).toBe(true);
    expect(result[0].content).toBe('hello');
  });

  it('handles a round with only user and assistant messages', async () => {
    const previousRounds = [
      createRound({
        id: 'round-1',
        input: makeRoundInput('hi'),
        steps: [],
        response: makeAssistantResponse('hello!'),
        started_at: now,
        time_to_first_token: 42,
        time_to_last_token: 100,
      }),
    ];
    const nextInput = makeRoundInput('how are you?');
    const result = await conversationToLangchainMessages({
      conversation: createConversation({ previousRounds, nextInput }),
    });

    expect(result).toHaveLength(3);

    const [firstHumanMessage, firstAssistantMessage, secondHumanMessage] = result;
    expect(isHumanMessage(firstHumanMessage)).toBe(true);
    expect(firstHumanMessage.content).toBe('hi');
    expect(isAIMessage(firstAssistantMessage)).toBe(true);
    expect(firstAssistantMessage.content).toBe('hello!');
    expect(isHumanMessage(secondHumanMessage)).toBe(true);
    expect(secondHumanMessage.content).toBe('how are you?');
  });

  it('handles a round with a tool call step', async () => {
    const toolCall = makeToolCallWithResult('call-1', 'search', { query: 'foo' }, [
      {
        tool_result_id: 'result-1',
        type: ToolResultType.other,
        data: {
          some: 'result1',
        },
      },
    ]);
    const previousRounds = [
      createRound({
        id: 'round-1',
        input: makeRoundInput('find foo'),
        steps: [makeToolCallStep(toolCall)],
        response: makeAssistantResponse('done!'),
        started_at: now,
        time_to_first_token: 42,
        time_to_last_token: 100,
      }),
    ];
    const nextInput = makeRoundInput('next');
    const result = await conversationToLangchainMessages({
      conversation: createConversation({ previousRounds, nextInput }),
    });
    // 1 user + 1 tool call (AI + Tool) + 1 assistant + 1 user
    expect(result).toHaveLength(5);
    const [
      firstHumanMessage,
      toolCallAIMessage,
      toolCallToolMessage,
      assistantMessage,
      nextHumanMessage,
    ] = result;
    expect(isHumanMessage(firstHumanMessage)).toBe(true);
    expect(firstHumanMessage.content).toBe('find foo');
    expect(isAIMessage(toolCallAIMessage)).toBe(true);
    expect((toolCallAIMessage as AIMessage).tool_calls).toHaveLength(1);
    expect((toolCallAIMessage as AIMessage).tool_calls![0].id).toBe('call-1');
    // ToolMessage type guard is not imported, so just check property
    expect((toolCallToolMessage as ToolMessage).tool_call_id).toBe('call-1');
    expect(toolCallToolMessage.content).toEqual(
      JSON.stringify({
        results: [
          {
            tool_result_id: 'result-1',
            type: ToolResultType.other,
            data: {
              some: 'result1',
            },
          },
        ],
      })
    );
    expect(isAIMessage(assistantMessage)).toBe(true);
    expect(assistantMessage.content).toBe('done!');
    expect(isHumanMessage(nextHumanMessage)).toBe(true);
    expect(nextHumanMessage.content).toBe('next');
  });

  it('handles multiple rounds', async () => {
    const previousRounds = [
      createRound({
        id: 'round-1',
        input: makeRoundInput('hi'),
        steps: [],
        response: makeAssistantResponse('hello!'),
        started_at: now,
        time_to_first_token: 42,
        time_to_last_token: 100,
      }),
      createRound({
        id: 'round-2',
        input: makeRoundInput('search for bar'),
        steps: [
          makeToolCallStep(
            makeToolCallWithResult('call-2', 'lookup', { id: 42 }, [
              { tool_result_id: 'result-2', type: ToolResultType.other, data: { some: 'result1' } },
            ])
          ),
        ],
        response: makeAssistantResponse('done with bar'),
        started_at: now,
        time_to_first_token: 42,
        time_to_last_token: 100,
      }),
    ];
    const nextInput = makeRoundInput('bye');
    const result = await conversationToLangchainMessages({
      conversation: createConversation({ previousRounds, nextInput }),
    });
    // 1 user + 1 assistant + 1 user + 1 tool call (AI + Tool) + 1 assistant + 1 user
    expect(result).toHaveLength(7);
    const [
      firstHumanMessage,
      firstAssistantMessage,
      secondHumanMessage,
      toolCallAIMessage,
      toolCallToolMessage,
      secondAssistantMessage,
      lastHumanMessage,
    ] = result;
    expect(isHumanMessage(firstHumanMessage)).toBe(true);
    expect(firstHumanMessage.content).toBe('hi');
    expect(isAIMessage(firstAssistantMessage)).toBe(true);
    expect(firstAssistantMessage.content).toBe('hello!');
    expect(isHumanMessage(secondHumanMessage)).toBe(true);
    expect(secondHumanMessage.content).toBe('search for bar');
    expect(isAIMessage(toolCallAIMessage)).toBe(true);
    expect((toolCallAIMessage as AIMessage).tool_calls).toHaveLength(1);
    expect((toolCallAIMessage as AIMessage).tool_calls![0].id).toBe('call-2');
    expect((toolCallToolMessage as ToolMessage).tool_call_id).toBe('call-2');
    expect(toolCallToolMessage.content).toEqual(
      JSON.stringify({
        results: [
          { tool_result_id: 'result-2', type: ToolResultType.other, data: { some: 'result1' } },
        ],
      })
    );
    expect(isAIMessage(secondAssistantMessage)).toBe(true);
    expect(secondAssistantMessage.content).toBe('done with bar');
    expect(isHumanMessage(lastHumanMessage)).toBe(true);
    expect(lastHumanMessage.content).toBe('bye');
  });

  it('escapes tool ids', async () => {
    const toolCall = makeToolCallWithResult('call-1', '.search', { query: 'foo' }, [
      {
        tool_result_id: 'result-1',
        type: ToolResultType.other,
        data: {
          some: 'data',
        },
      },
    ]);
    const previousRounds = [
      createRound({
        id: 'round-1',
        input: makeRoundInput('find foo'),
        steps: [makeToolCallStep(toolCall)],
        response: makeAssistantResponse('done!'),
        started_at: now,
        time_to_first_token: 42,
        time_to_last_token: 100,
      }),
    ];
    const nextInput = makeRoundInput('next');
    const result = await conversationToLangchainMessages({
      conversation: createConversation({ previousRounds, nextInput }),
    });
    // 1 user + 1 tool call (AI + Tool) + 1 assistant + 1 user
    expect(result).toHaveLength(5);
    const [_human, toolCallAIMessage] = result;

    expect(isAIMessage(toolCallAIMessage)).toBe(true);
    expect((toolCallAIMessage as AIMessage).tool_calls).toHaveLength(1);
    expect((toolCallAIMessage as AIMessage).tool_calls![0].name).toBe(sanitizeToolId('.search'));
  });

  describe('with attachments', () => {
    it('includes a single attachment in the user message', async () => {
      const attachment = makeProcessedAttachment(
        'att-1',
        'text',
        { content: 'test content' },
        'This is the formatted text content'
      );
      const nextInput = makeRoundInput('hello with attachment', [attachment]);
      const result = await conversationToLangchainMessages({
        conversation: createConversation({ previousRounds: [], nextInput }),
      });

      expect(result).toHaveLength(1);
      expect(isHumanMessage(result[0])).toBe(true);
      expect(result[0].content).toContain('hello with attachment');
      expect(result[0].content).toContain('<attachments>');
      expect(result[0].content).toContain('<attachment type="text" id="att-1">');
      expect(result[0].content).toContain('This is the formatted text content');
      expect(result[0].content).toContain('</attachment>');
      expect(result[0].content).toContain('</attachments>');
    });

    it('includes multiple attachments in the user message', async () => {
      const attachment1 = makeProcessedAttachment(
        'att-1',
        'text',
        { content: 'first' },
        'First attachment content'
      );
      const attachment2 = makeProcessedAttachment(
        'att-2',
        'screen_context',
        { url: 'http://example.com' },
        'Screen context data'
      );
      const nextInput = makeRoundInput('message with multiple attachments', [
        attachment1,
        attachment2,
      ]);
      const result = await conversationToLangchainMessages({
        conversation: createConversation({ nextInput }),
      });

      expect(result).toHaveLength(1);
      expect(isHumanMessage(result[0])).toBe(true);
      const content = result[0].content as string;
      expect(content).toContain('message with multiple attachments');
      expect(content).toContain('<attachments>');
      expect(content).toContain('<attachment type="text" id="att-1">');
      expect(content).toContain('First attachment content');
      expect(content).toContain('<attachment type="screen_context" id="att-2">');
      expect(content).toContain('Screen context data');
      expect(content).toContain('</attachments>');
    });

    it('includes attachments from previous rounds', async () => {
      const attachment = makeProcessedAttachment(
        'prev-att-1',
        'text',
        { content: 'previous' },
        'Previous round attachment'
      );
      const previousRounds = [
        createRound({
          id: 'round-1',
          input: makeRoundInput('message with attachment', [attachment]),
          steps: [],
          response: makeAssistantResponse('got it'),
          started_at: now,
          time_to_first_token: 42,
          time_to_last_token: 100,
        }),
      ];
      const nextInput = makeRoundInput('next message');
      const result = await conversationToLangchainMessages({
        conversation: createConversation({ previousRounds, nextInput }),
      });

      expect(result).toHaveLength(3);
      const [firstHumanMessage, assistantMessage, secondHumanMessage] = result;

      expect(isHumanMessage(firstHumanMessage)).toBe(true);
      const firstContent = firstHumanMessage.content as string;
      expect(firstContent).toContain('message with attachment');
      expect(firstContent).toContain('<attachments>');
      expect(firstContent).toContain('<attachment type="text" id="prev-att-1">');
      expect(firstContent).toContain('Previous round attachment');

      expect(isAIMessage(assistantMessage)).toBe(true);
      expect(assistantMessage.content).toBe('got it');

      expect(isHumanMessage(secondHumanMessage)).toBe(true);
      expect(secondHumanMessage.content).toBe('next message');
      expect(secondHumanMessage.content).not.toContain('<attachments>');
    });
  });
});

describe('conversationToLangchainMessages with resultTransformer', () => {
  const now = new Date().toISOString();

  const makeRoundInput = (
    message: string,
    attachments: ProcessedAttachment[] = []
  ): ProcessedRoundInput => ({
    message,
    attachments,
  });
  const makeAssistantResponse = (message: string) => ({ message });
  const makeToolCallWithResult = (
    id: string,
    toolId: string,
    params: any,
    results: ToolResult[]
  ): ToolCallWithResult => ({
    tool_call_id: id,
    tool_id: toolId,
    params,
    results,
  });
  const makeToolCallStep = (toolCall: ToolCallWithResult): ToolCallStep => ({
    ...toolCall,
    type: ConversationRoundStepType.toolCall,
  });

  const createConversation = (
    parts: Partial<ProcessedConversation> = {}
  ): ProcessedConversation => {
    return {
      nextInput: { message: '', attachments: [] },
      previousRounds: [],
      attachments: [],
      attachmentTypes: [],
      attachmentStateManager: createAttachmentStateManager([], {
        getTypeDefinition: (type: string) =>
          ({
            id: type,
            validate: (input: unknown) => ({ valid: true, data: input }),
            format: () => ({ getRepresentation: () => ({ type: 'text', value: '' }) }),
          } as any),
      }),
      ...parts,
    };
  };

  const createRound = (
    parts: Partial<ProcessedConversationRound> = {}
  ): ProcessedConversationRound => {
    return {
      id: 'round-1',
      status: ConversationRoundStatus.completed,
      input: {
        message: '',
        attachments: [],
      },
      steps: [],
      response: {
        message: 'Response',
      },
      started_at: new Date().toISOString(),
      time_to_first_token: 0,
      time_to_last_token: 0,
      model_usage: {
        connector_id: 'unknown',
        llm_calls: 1,
        input_tokens: 12,
        output_tokens: 42,
      },
      ...parts,
    };
  };

  const createMockFileStore = (entries: Map<string, FileEntry>): IFileStore => ({
    read: jest.fn(async (path: string) => entries.get(path)),
    ls: jest.fn(),
    glob: jest.fn(),
    grep: jest.fn(),
  });

  const createFileEntry = (
    path: string,
    tokenCount: number,
    data: Record<string, unknown> = {}
  ): FileEntry => ({
    path,
    type: 'file',
    metadata: {
      type: 'tool_result' as any,
      id: 'result-id',
      token_count: tokenCount,
      readonly: true,
    },
    content: {
      raw: data,
      plain_text: JSON.stringify(data),
    },
  });

  describe('createFilestoreResultTransformer', () => {
    it('keeps tool results below threshold as-is', async () => {
      const toolCall = makeToolCallWithResult('call-1', 'search', { query: 'foo' }, [
        {
          tool_result_id: 'result-1',
          type: ToolResultType.other,
          data: { some: 'result1' },
        },
      ]);
      const previousRounds = [
        createRound({
          id: 'round-1',
          input: makeRoundInput('find foo'),
          steps: [makeToolCallStep(toolCall)],
          response: makeAssistantResponse('done!'),
          started_at: now,
        }),
      ];
      const nextInput = makeRoundInput('next');
      const conversation = createConversation({ previousRounds, nextInput });

      // Create file entry with token count below threshold
      const entries = new Map<string, FileEntry>();
      entries.set(
        '/tool_calls/search/call-1/result-1.json',
        createFileEntry('/tool_calls/search/call-1/result-1.json', 100, { some: 'result1' })
      );
      const filestore = createMockFileStore(entries);

      const result = await conversationToLangchainMessages({
        conversation,
        resultTransformer: createFilestoreResultTransformer(filestore),
      });

      // 1 user + 1 tool call (AI + Tool) + 1 assistant + 1 user
      expect(result).toHaveLength(5);
      const toolResultMessage = result[2] as ToolMessage;
      const content = JSON.parse(toolResultMessage.content as string);

      // Result should be kept as-is (not replaced with file reference)
      expect(content.results[0].type).toBe(ToolResultType.other);
      expect(content.results[0].data).toEqual({ some: 'result1' });
    });

    it('substitutes tool results above threshold with file references', async () => {
      const toolCall = makeToolCallWithResult('call-1', 'search', { query: 'foo' }, [
        {
          tool_result_id: 'result-1',
          type: ToolResultType.other,
          data: { some: 'large-result' },
        },
      ]);
      const previousRounds = [
        createRound({
          id: 'round-1',
          input: makeRoundInput('find foo'),
          steps: [makeToolCallStep(toolCall)],
          response: makeAssistantResponse('done!'),
          started_at: now,
        }),
      ];
      const nextInput = makeRoundInput('next');
      const conversation = createConversation({ previousRounds, nextInput });

      // Create file entry with token count above threshold
      const entries = new Map<string, FileEntry>();
      entries.set(
        '/tool_calls/search/call-1/result-1.json',
        createFileEntry(
          '/tool_calls/search/call-1/result-1.json',
          FILE_REFERENCE_TOKEN_THRESHOLD + 100,
          { some: 'large-result' }
        )
      );
      const filestore = createMockFileStore(entries);

      const result = await conversationToLangchainMessages({
        conversation,
        resultTransformer: createFilestoreResultTransformer(filestore),
      });

      // 1 user + 1 tool call (AI + Tool) + 1 assistant + 1 user
      expect(result).toHaveLength(5);
      const toolResultMessage = result[2] as ToolMessage;
      const content = JSON.parse(toolResultMessage.content as string);

      // Result should be replaced with file reference
      expect(content.results[0].type).toBe(ToolResultType.fileReference);
      expect(content.results[0].data.filepath).toBe('/tool_calls/search/call-1/result-1.json');
      expect(content.results[0].data.comment).toContain('filestore_read');
    });

    it('handles mixed results (some above, some below threshold)', async () => {
      const toolCall = makeToolCallWithResult('call-1', 'search', { query: 'foo' }, [
        {
          tool_result_id: 'result-1',
          type: ToolResultType.other,
          data: { small: 'result' },
        },
        {
          tool_result_id: 'result-2',
          type: ToolResultType.other,
          data: { large: 'result' },
        },
      ]);
      const previousRounds = [
        createRound({
          id: 'round-1',
          input: makeRoundInput('find foo'),
          steps: [makeToolCallStep(toolCall)],
          response: makeAssistantResponse('done!'),
          started_at: now,
        }),
      ];
      const nextInput = makeRoundInput('next');
      const conversation = createConversation({ previousRounds, nextInput });

      const entries = new Map<string, FileEntry>();
      // First result below threshold
      entries.set(
        '/tool_calls/search/call-1/result-1.json',
        createFileEntry('/tool_calls/search/call-1/result-1.json', 100, { small: 'result' })
      );
      // Second result above threshold
      entries.set(
        '/tool_calls/search/call-1/result-2.json',
        createFileEntry(
          '/tool_calls/search/call-1/result-2.json',
          FILE_REFERENCE_TOKEN_THRESHOLD + 100,
          { large: 'result' }
        )
      );
      const filestore = createMockFileStore(entries);

      const result = await conversationToLangchainMessages({
        conversation,
        resultTransformer: createFilestoreResultTransformer(filestore),
      });

      const toolResultMessage = result[2] as ToolMessage;
      const content = JSON.parse(toolResultMessage.content as string);

      // First result should be kept as-is
      expect(content.results[0].type).toBe(ToolResultType.other);
      expect(content.results[0].data).toEqual({ small: 'result' });

      // Second result should be replaced with file reference
      expect(content.results[1].type).toBe(ToolResultType.fileReference);
      expect(content.results[1].data.filepath).toBe('/tool_calls/search/call-1/result-2.json');
    });

    it('keeps result if not found in filestore', async () => {
      const toolCall = makeToolCallWithResult('call-1', 'search', { query: 'foo' }, [
        {
          tool_result_id: 'result-1',
          type: ToolResultType.other,
          data: { some: 'result' },
        },
      ]);
      const previousRounds = [
        createRound({
          id: 'round-1',
          input: makeRoundInput('find foo'),
          steps: [makeToolCallStep(toolCall)],
          response: makeAssistantResponse('done!'),
          started_at: now,
        }),
      ];
      const nextInput = makeRoundInput('next');
      const conversation = createConversation({ previousRounds, nextInput });

      // Empty filestore - no entries
      const filestore = createMockFileStore(new Map());

      const result = await conversationToLangchainMessages({
        conversation,
        resultTransformer: createFilestoreResultTransformer(filestore),
      });

      const toolResultMessage = result[2] as ToolMessage;
      const content = JSON.parse(toolResultMessage.content as string);

      // Result should be kept as-is since entry not found
      expect(content.results[0].type).toBe(ToolResultType.other);
      expect(content.results[0].data).toEqual({ some: 'result' });
    });

    it('respects custom threshold parameter', async () => {
      const toolCall = makeToolCallWithResult('call-1', 'search', { query: 'foo' }, [
        {
          tool_result_id: 'result-1',
          type: ToolResultType.other,
          data: { some: 'result' },
        },
      ]);
      const previousRounds = [
        createRound({
          id: 'round-1',
          input: makeRoundInput('find foo'),
          steps: [makeToolCallStep(toolCall)],
          response: makeAssistantResponse('done!'),
          started_at: now,
        }),
      ];
      const nextInput = makeRoundInput('next');
      const conversation = createConversation({ previousRounds, nextInput });

      const entries = new Map<string, FileEntry>();
      // Token count of 500 - below default threshold but above custom threshold of 100
      entries.set(
        '/tool_calls/search/call-1/result-1.json',
        createFileEntry('/tool_calls/search/call-1/result-1.json', 500, { some: 'result' })
      );
      const filestore = createMockFileStore(entries);

      // Use custom threshold of 100
      const result = await conversationToLangchainMessages({
        conversation,
        resultTransformer: createFilestoreResultTransformer(filestore, 100),
      });

      const toolResultMessage = result[2] as ToolMessage;
      const content = JSON.parse(toolResultMessage.content as string);

      // Result should be replaced with file reference due to custom threshold
      expect(content.results[0].type).toBe(ToolResultType.fileReference);
    });
  });

  describe('custom resultTransformer', () => {
    it('applies custom transformer to tool results', async () => {
      const toolCall = makeToolCallWithResult('call-1', 'search', { query: 'foo' }, [
        {
          tool_result_id: 'result-1',
          type: ToolResultType.other,
          data: { original: 'data' },
        },
      ]);
      const previousRounds = [
        createRound({
          id: 'round-1',
          input: makeRoundInput('find foo'),
          steps: [makeToolCallStep(toolCall)],
          response: makeAssistantResponse('done!'),
          started_at: now,
        }),
      ];
      const nextInput = makeRoundInput('next');
      const conversation = createConversation({ previousRounds, nextInput });

      // Custom transformer that adds metadata
      const customTransformer = jest.fn(async (result, context) => ({
        ...result,
        data: {
          ...result.data,
          transformedBy: 'custom',
          toolId: context.toolId,
        },
      }));

      const result = await conversationToLangchainMessages({
        conversation,
        resultTransformer: customTransformer,
      });

      const toolResultMessage = result[2] as ToolMessage;
      const content = JSON.parse(toolResultMessage.content as string);

      expect(customTransformer).toHaveBeenCalledWith(
        expect.objectContaining({ tool_result_id: 'result-1' }),
        { toolId: 'search', toolCallId: 'call-1' }
      );
      expect(content.results[0].data).toEqual({
        original: 'data',
        transformedBy: 'custom',
        toolId: 'search',
      });
    });
  });
});
