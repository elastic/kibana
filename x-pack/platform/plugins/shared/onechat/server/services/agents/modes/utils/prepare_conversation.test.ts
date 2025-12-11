/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { ConversationRound, RawRoundInput } from '@kbn/onechat-common';
import { ConversationRoundStepType, ToolResultType, ToolType } from '@kbn/onechat-common';
import type { Attachment, AttachmentInput } from '@kbn/onechat-common/attachments';
import type { AttachmentsService } from '@kbn/onechat-server/runner';
import type {
  AttachmentBoundedTool,
  AttachmentRepresentation,
  AttachmentTypeDefinition,
} from '@kbn/onechat-server/attachments';
import { getToolResultId } from '@kbn/onechat-server/tools';
import {
  createAgentHandlerContextMock,
  type AgentHandlerContextMock,
} from '../../../../test_utils/runner';
import { prepareConversation } from './prepare_conversation';

jest.mock('@kbn/onechat-server/tools', () => ({
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

  const boundedTool = (id = 'bounded_tool'): AttachmentBoundedTool => {
    return {
      id,
      type: ToolType.builtin,
      description: 'test tool',
      handler: jest.fn(),
      schema: z.object({}),
    } as AttachmentBoundedTool;
  };

  beforeEach(() => {
    mockContext = createAgentHandlerContextMock();
    mockAttachmentsService = mockContext.attachments;

    mockGetToolResultId.mockReset();
    let idCounter = 0;
    mockGetToolResultId.mockImplementation(() => `generated-id-${++idCounter}`);
  });

  const createRound = (parts: Partial<ConversationRound> = {}): ConversationRound => {
    return {
      id: 'round-1',
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
      const nextInput: RawRoundInput = {
        message: 'Hello',
      };

      const result = await prepareConversation({
        previousRounds: [],
        nextInput,
        context: mockContext,
      });

      expect(result).toEqual({
        attachments: [],
        attachmentTypes: [],
        nextInput: {
          message: 'Hello',
          attachments: [],
        },
        previousRounds: [],
      });

      expect(mockAttachmentsService.getTypeDefinition).not.toHaveBeenCalled();
    });

    it('should handle empty attachments array', async () => {
      const nextInput: RawRoundInput = {
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

  describe('nextInput with attachments', () => {
    it('collect attachment types', async () => {
      const attachment1: AttachmentInput = {
        type: 'text',
        data: { content: 'content 1' },
      };

      const attachment2: AttachmentInput = {
        type: 'screen_context',
        data: { url: 'http://example.com' },
        hidden: true,
      };

      const mockRepresentation1 = textRepresentation('formatted 1');
      const mockRepresentation2 = textRepresentation('formatted 2');

      const textDefinition = attachmentDefinition({
        id: 'text',
        description: 'foobar',
        repr: mockRepresentation1,
      });
      const screenContextDefinition = attachmentDefinition({
        id: 'screen_context',
        repr: mockRepresentation2,
      });

      mockAttachmentsService.getTypeDefinition.mockImplementation((id) => {
        if (id === 'text') {
          return textDefinition;
        }
        if (id === 'screen_context') {
          return screenContextDefinition;
        }
        throw new Error(`Unexpected attachment type: ${id}`);
      });

      const nextInput: RawRoundInput = {
        message: 'Hello',
        attachments: [attachment1, attachment2],
      };

      const result = await prepareConversation({
        nextInput,
        previousRounds: [],
        context: mockContext,
      });

      expect(result.nextInput.attachments).toHaveLength(2);

      expect(result.attachmentTypes).toEqual([
        {
          type: 'text',
          description: 'foobar',
        },
        {
          type: 'screen_context',
        },
      ]);
    });

    it('collect bounded tools', async () => {
      const attachment: AttachmentInput = {
        type: 'text',
        data: { content: 'content 1' },
      };

      const mockRepresentation = textRepresentation('formatted 1');

      const textDefinition = attachmentDefinition({
        id: 'text',
        repr: mockRepresentation,
        boundedTools: [boundedTool('tool_1'), boundedTool('tool_2')],
      });

      mockAttachmentsService.getTypeDefinition.mockReturnValue(textDefinition);

      const nextInput: RawRoundInput = {
        message: 'Hello',
        attachments: [attachment],
      };

      const result = await prepareConversation({
        nextInput,
        previousRounds: [],
        context: mockContext,
      });

      expect(result.nextInput.attachments).toHaveLength(1);
      expect(result.nextInput.attachments[0].tools.map((t) => t.id)).toEqual(['tool_1', 'tool_2']);
    });

    it('should generate ID for attachment without ID', async () => {
      const attachment: AttachmentInput = {
        type: 'text',
        data: { content: 'test content' },
      };

      const mockRepresentation = textRepresentation('formatted text');

      mockAttachmentsService.getTypeDefinition.mockReturnValue(
        attachmentDefinition({ id: 'text', repr: mockRepresentation })
      );

      const nextInput: RawRoundInput = {
        message: 'Hello',
        attachments: [attachment],
      };

      const result = await prepareConversation({
        previousRounds: [],
        nextInput,
        context: mockContext,
      });

      expect(result.nextInput.attachments).toHaveLength(1);
      expect(result.nextInput.attachments[0].attachment.id).toEqual('generated-id-1');

      expect(mockGetToolResultId).toHaveBeenCalledTimes(1);
      expect(mockAttachmentsService.getTypeDefinition).toHaveBeenCalledTimes(2);
    });

    it('should preserve existing ID for attachment with ID', async () => {
      const attachment: AttachmentInput = {
        id: 'existing-id',
        type: 'text',
        data: { content: 'test content' },
      };

      const mockRepresentation = textRepresentation('formatted text');

      mockAttachmentsService.getTypeDefinition.mockReturnValue(
        attachmentDefinition({ id: 'text', repr: mockRepresentation })
      );

      const nextInput: RawRoundInput = {
        message: 'Hello',
        attachments: [attachment],
      };

      const result = await prepareConversation({
        previousRounds: [],
        nextInput,
        context: mockContext,
      });

      expect(result.nextInput.attachments[0].attachment.id).toEqual('existing-id');

      expect(mockGetToolResultId).not.toHaveBeenCalled();
      expect(mockAttachmentsService.getTypeDefinition).toHaveBeenCalledTimes(2);
    });

    it('should process multiple attachments', async () => {
      const attachment1: AttachmentInput = {
        type: 'text',
        data: { content: 'content 1' },
      };

      const attachment2: AttachmentInput = {
        id: 'existing-id',
        type: 'text',
        data: { content: 'content 2' },
      };

      const attachment3: AttachmentInput = {
        type: 'screen_context',
        data: { url: 'http://example.com' },
        hidden: true,
      };

      const mockRepresentation1 = textRepresentation('formatted 1');
      const mockRepresentation2 = textRepresentation('formatted 2');
      const mockRepresentation3 = textRepresentation('formatted 3');

      const getRepresentation = jest
        .fn()
        .mockResolvedValueOnce(mockRepresentation1)
        .mockResolvedValueOnce(mockRepresentation2)
        .mockResolvedValueOnce(mockRepresentation3);

      const definition: AttachmentTypeDefinition = {
        id: 'foo',
        validate: jest.fn(),
        format: () => {
          return {
            getRepresentation,
          };
        },
      };

      mockAttachmentsService.getTypeDefinition.mockReturnValue(definition);

      const nextInput: RawRoundInput = {
        message: 'Hello',
        attachments: [attachment1, attachment2, attachment3],
      };

      const result = await prepareConversation({
        previousRounds: [],
        nextInput,
        context: mockContext,
      });

      expect(result.nextInput.attachments).toHaveLength(3);
      expect(result.nextInput.attachments[0]).toEqual({
        attachment: { ...attachment1, id: 'generated-id-1' },
        representation: mockRepresentation1,
        tools: [],
      });
      expect(result.nextInput.attachments[1]).toEqual({
        attachment: { ...attachment2, id: 'existing-id' },
        representation: mockRepresentation2,
        tools: [],
      });
      expect(result.nextInput.attachments[2]).toEqual({
        attachment: { ...attachment3, id: 'generated-id-2' },
        representation: mockRepresentation3,
        tools: [],
      });

      expect(mockGetToolResultId).toHaveBeenCalledTimes(2);
    });

    it('should preserve attachment properties', async () => {
      const attachment: AttachmentInput = {
        type: 'text',
        data: { content: 'test' },
        hidden: true,
      };

      const mockRepresentation = textRepresentation('formatted');

      mockAttachmentsService.getTypeDefinition.mockReturnValue(
        attachmentDefinition({ id: 'text', repr: mockRepresentation })
      );

      const nextInput: RawRoundInput = {
        message: 'Hello',
        attachments: [attachment],
      };

      const result = await prepareConversation({
        previousRounds: [],
        nextInput,
        context: mockContext,
      });

      expect(result.nextInput.attachments[0].attachment).toEqual({
        ...attachment,
        id: 'generated-id-1',
        hidden: true,
      });
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

      const mockRepresentation = textRepresentation('formatted previous');

      mockAttachmentsService.getTypeDefinition.mockReturnValue(
        attachmentDefinition({ id: 'text', repr: mockRepresentation })
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

      expect(result.previousRounds[0].input.attachments).toHaveLength(1);
      expect(result.previousRounds[0].input.attachments[0]).toEqual({
        attachment: {
          ...attachment,
          id: 'prev-attachment-id',
        },
        representation: mockRepresentation,
        tools: [],
      });

      expect(mockAttachmentsService.getTypeDefinition).toHaveBeenCalledTimes(2);
    });

    it('should process multiple previous rounds', async () => {
      const mockRepresentation = textRepresentation('formatted');

      mockAttachmentsService.getTypeDefinition.mockReturnValue(
        attachmentDefinition({ id: 'text', repr: mockRepresentation })
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
      expect(result.previousRounds[0].input.attachments).toHaveLength(1);
      expect(result.previousRounds[0].input.attachments[0].attachment.id).toBe('attachment-1');

      expect(result.previousRounds[1].id).toBe('round-2');
      expect(result.previousRounds[1].input.attachments).toHaveLength(0);

      expect(result.previousRounds[2].id).toBe('round-3');
      expect(result.previousRounds[2].input.attachments).toHaveLength(1);
      expect(result.previousRounds[2].input.attachments[0].attachment.id).toBe('attachment-2');

      expect(mockGetToolResultId).not.toHaveBeenCalled();
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
