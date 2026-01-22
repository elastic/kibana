/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound, ConverseInput } from '@kbn/agent-builder-common';
import {
  ConversationRoundStatus,
  ConversationRoundStepType,
  ToolResultType,
} from '@kbn/agent-builder-common';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentsService } from '@kbn/agent-builder-server/runner';
import type {
  AttachmentBoundedTool,
  AttachmentRepresentation,
  AttachmentTypeDefinition,
} from '@kbn/agent-builder-server/attachments';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import {
  createAgentHandlerContextMock,
  type AgentHandlerContextMock,
} from '../../../../test_utils/runner';
import { prepareConversation } from './prepare_conversation';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';

jest.mock('@kbn/agent-builder-server/tools', () => ({
  getToolResultId: jest.fn(),
}));

const mockGetToolResultId = getToolResultId as jest.MockedFunction<typeof getToolResultId>;

describe('prepareConversation', () => {
  let mockContext: AgentHandlerContextMock;
  let mockAttachmentsService: jest.Mocked<AttachmentsService>;

  const attachmentDefinition = ({
    id = 'text',
    description,
    repr,
    boundedTools = [],
  }: {
    id?: string;
    description?: string;
    repr: AttachmentRepresentation;
    boundedTools?: AttachmentBoundedTool[];
  }): AttachmentTypeDefinition => {
    return {
      id,
      validate: jest.fn(),
      format: jest.fn().mockImplementation(() => {
        return {
          getRepresentation: () => repr,
          getBoundedTools: () => boundedTools,
        };
      }),
      getAgentDescription: description ? () => description : undefined,
    };
  };

  const textRepresentation = (value: string): AttachmentRepresentation => ({ type: 'text', value });

  beforeEach(() => {
    mockContext = createAgentHandlerContextMock();
    mockAttachmentsService = mockContext.attachments;
    // prepareConversation relies on a real attachmentStateManager (it mutates it).
    (mockContext as any).attachmentStateManager = createAttachmentStateManager([]);

    mockGetToolResultId.mockReset();
    let idCounter = 0;
    mockGetToolResultId.mockImplementation(() => `generated-id-${++idCounter}`);
  });

  const createRound = (parts: Partial<ConversationRound> = {}): ConversationRound => {
    return {
      id: 'round-1',
      status: ConversationRoundStatus.completed,
      input: {
        message: '',
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

  describe('with no attachments', () => {
    it('should process a simple nextInput with no attachments', async () => {
      const nextInput: ConverseInput = {
        message: 'Hello',
      };

      const result = await prepareConversation({
        previousRounds: [],
        nextInput,
        context: mockContext,
      });

      expect(result).toMatchObject({
        attachments: [],
        attachmentTypes: [],
        nextInput: {
          message: 'Hello',
          attachments: [],
        },
        previousRounds: [],
      });
      expect(result.attachmentStateManager).toBeDefined();

      expect(mockAttachmentsService.getTypeDefinition).not.toHaveBeenCalled();
    });

    it('should handle empty attachments array', async () => {
      const nextInput: ConverseInput = {
        message: 'Hello',
        attachments: [],
      };

      const result = await prepareConversation({
        previousRounds: [],
        nextInput,
        context: mockContext,
      });

      expect(result.nextInput.attachments).toEqual([]);
      expect(mockAttachmentsService.getTypeDefinition).not.toHaveBeenCalled();
    });
  });

  describe('legacy per-round attachments are promoted to conversation attachments and stripped from rounds', () => {
    it('promotes nextInput attachments into attachmentStateManager and strips nextInput attachments', async () => {
      // Use a real attachment state manager (not the jest mock) to assert promotion/versioning behavior
      (mockContext as any).attachmentStateManager = createAttachmentStateManager([]);

      // We only need getTypeDefinition for attachmentTypes; it won't be used for formatting since we strip.
      mockAttachmentsService.getTypeDefinition.mockReturnValue({
        id: 'text',
        validate: jest.fn(),
        format: jest.fn(),
        getAgentDescription: () => 'desc',
      } as any);

      const nextInput: ConverseInput = {
        message: 'Hello',
        attachments: [{ id: 'a-1', type: 'text', data: { content: 'v1' } }],
      };

      const result = await prepareConversation({
        previousRounds: [],
        nextInput,
        context: mockContext,
      });

      expect(result.nextInput.attachments).toEqual([]); // stripped
      expect(result.attachmentStateManager.getAll()).toHaveLength(1); // promoted
      expect(result.attachmentStateManager.getAll()[0]).toMatchObject({
        id: 'a-1',
        type: 'text',
        current_version: 1,
      });
      expect(result.attachmentTypes.map((t) => t.type)).toEqual(['text']);
      expect(result.versionedAttachmentPresentation?.activeCount).toBe(1);
    });

    it('treats same ID as a new version of an existing attachment', async () => {
      const existing: VersionedAttachment = {
        id: 'a-1',
        type: 'text',
        active: true,
        current_version: 1,
        versions: [
          {
            version: 1,
            data: { content: 'v1' },
            created_at: '2024-01-01T00:00:00.000Z',
            content_hash: 'hash-v1',
            estimated_tokens: 1,
          },
        ],
      };

      (mockContext as any).attachmentStateManager = createAttachmentStateManager([existing]);
      mockAttachmentsService.getTypeDefinition.mockReturnValue({
        id: 'text',
        validate: jest.fn(),
        format: jest.fn(),
        getAgentDescription: () => 'desc',
      } as any);

      const nextInput: ConverseInput = {
        message: 'Hello',
        attachments: [{ id: 'a-1', type: 'text', data: { content: 'v2' } }],
      };

      const result = await prepareConversation({
        previousRounds: [],
        nextInput,
        context: mockContext,
      });

      const all = result.attachmentStateManager.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe('a-1');
      expect(all[0].current_version).toBe(2);
    });
  });

  describe('previousRounds with attachments', () => {
    it('should process previous rounds without attachments', async () => {
      const previousRound = createRound({
        id: 'round-1',
        input: {
          message: 'Previous message',
        },
        steps: [],
        response: {
          message: 'Response',
        },
      });

      const previousRounds: ConversationRound[] = [previousRound];

      const result = await prepareConversation({
        previousRounds,
        nextInput: { message: 'New message' },
        context: mockContext,
      });

      expect(result.previousRounds).toHaveLength(1);
      expect(result.previousRounds[0]).toEqual({
        ...previousRound,
        input: {
          ...previousRound.input,
          attachments: [],
        },
      });
    });

    it('should process previous rounds with attachments', async () => {
      const attachment: Attachment = {
        id: 'prev-attachment-id',
        type: 'text',
        data: { content: 'previous content' },
      };

      mockAttachmentsService.getTypeDefinition.mockReturnValue(
        attachmentDefinition({ id: 'text', repr: textRepresentation('unused') })
      );

      const previousRounds = [
        createRound({
          id: 'round-1',
          input: {
            message: 'Previous message',
            attachments: [attachment],
          },
          steps: [],
          response: {
            message: 'Response',
          },
        }),
      ];

      const result = await prepareConversation({
        previousRounds,
        nextInput: { message: 'New message' },
        context: mockContext,
      });

      // stripped from previous rounds
      expect(result.previousRounds[0].input.attachments).toHaveLength(0);
      // promoted to conversation attachments
      expect(result.attachmentStateManager.getAll().map((a) => a.id)).toContain(
        'prev-attachment-id'
      );
    });

    it('should process multiple previous rounds', async () => {
      mockAttachmentsService.getTypeDefinition.mockReturnValue(
        attachmentDefinition({ id: 'text', repr: textRepresentation('unused') })
      );

      const previousRounds = [
        createRound({
          id: 'round-1',
          input: {
            message: 'Message 1',
            attachments: [
              {
                id: 'attachment-1',
                type: 'text',
                data: { content: 'content 1' },
              },
            ],
          },
          response: { message: 'Response 1' },
        }),
        createRound({
          id: 'round-2',
          input: {
            message: 'Message 2',
          },
          response: { message: 'Response 2' },
        }),
        createRound({
          id: 'round-3',
          input: {
            message: 'Message 3',
            attachments: [
              {
                id: 'attachment-2',
                type: 'text',
                data: { content: 'content 3' },
              },
            ],
          },
          response: { message: 'Response 3' },
        }),
      ];

      const result = await prepareConversation({
        previousRounds,
        nextInput: { message: 'New message' },
        context: mockContext,
      });

      expect(result.previousRounds).toHaveLength(3);
      expect(result.previousRounds[0].id).toBe('round-1');
      expect(result.previousRounds[0].input.attachments).toHaveLength(0);

      expect(result.previousRounds[1].id).toBe('round-2');
      expect(result.previousRounds[1].input.attachments).toHaveLength(0);

      expect(result.previousRounds[2].id).toBe('round-3');
      expect(result.previousRounds[2].input.attachments).toHaveLength(0);

      expect(mockGetToolResultId).not.toHaveBeenCalled();

      const ids = result.attachmentStateManager.getAll().map((a) => a.id);
      expect(ids).toEqual(expect.arrayContaining(['attachment-1', 'attachment-2']));
    });

    it('should preserve all round properties', async () => {
      const previousRounds = [
        createRound({
          id: 'round-1',
          input: {
            message: 'Message 1',
          },
          steps: [
            {
              type: ConversationRoundStepType.toolCall,
              tool_call_id: 'call-1',
              tool_id: 'test-tool',
              params: { param: 'value' },
              results: [{ tool_result_id: 'id', type: ToolResultType.other, data: {} }],
            },
          ],
          response: {
            message: 'Response 1',
          },
          trace_id: 'trace-123',
        }),
      ];

      const result = await prepareConversation({
        previousRounds,
        nextInput: { message: 'New message' },
        context: mockContext,
      });

      expect(result.previousRounds[0]).toEqual({
        ...previousRounds[0],
        input: {
          ...previousRounds[0].input,
          attachments: [],
        },
      });
    });
  });
});
