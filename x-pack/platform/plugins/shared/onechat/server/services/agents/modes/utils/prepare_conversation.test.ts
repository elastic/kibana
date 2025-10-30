/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound, RawRoundInput } from '@kbn/onechat-common';
import { ConversationRoundStepType, ToolResultType } from '@kbn/onechat-common';
import type { Attachment, AttachmentInput } from '@kbn/onechat-common/attachments';
import type { AttachmentsService } from '@kbn/onechat-server/runner';
import type { AttachmentRepresentation } from '@kbn/onechat-server/attachments';
import { getToolResultId } from '@kbn/onechat-server/tools';
import { prepareConversation } from './prepare_conversation';

jest.mock('@kbn/onechat-server/tools', () => ({
  getToolResultId: jest.fn(),
}));

const mockGetToolResultId = getToolResultId as jest.MockedFunction<typeof getToolResultId>;

describe('prepareConversation', () => {
  let mockAttachmentsService: jest.Mocked<AttachmentsService>;

  beforeEach(() => {
    mockAttachmentsService = {
      format: jest.fn(),
    };

    mockGetToolResultId.mockReset();
    let idCounter = 0;
    mockGetToolResultId.mockImplementation(() => `generated-id-${++idCounter}`);
  });

  describe('with no attachments', () => {
    it('should process a simple nextInput with no attachments', async () => {
      const nextInput: RawRoundInput = {
        message: 'Hello',
      };

      const result = await prepareConversation({
        previousRounds: [],
        nextInput,
        attachmentsService: mockAttachmentsService,
      });

      expect(result).toEqual({
        nextInput: {
          message: 'Hello',
          attachments: [],
        },
        previousRounds: [],
      });

      expect(mockAttachmentsService.format).not.toHaveBeenCalled();
    });

    it('should handle empty attachments array', async () => {
      const nextInput: RawRoundInput = {
        message: 'Hello',
        attachments: [],
      };

      const result = await prepareConversation({
        previousRounds: [],
        nextInput,
        attachmentsService: mockAttachmentsService,
      });

      expect(result.nextInput.attachments).toEqual([]);
      expect(mockAttachmentsService.format).not.toHaveBeenCalled();
    });
  });

  describe('nextInput with attachments', () => {
    it('should generate ID for attachment without ID', async () => {
      const attachment: AttachmentInput = {
        type: 'text',
        data: { content: 'test content' },
      };

      const mockRepresentation: AttachmentRepresentation = {
        type: 'text',
        value: 'formatted text',
      };

      mockAttachmentsService.format.mockResolvedValue(mockRepresentation);

      const nextInput: RawRoundInput = {
        message: 'Hello',
        attachments: [attachment],
      };

      const result = await prepareConversation({
        previousRounds: [],
        nextInput,
        attachmentsService: mockAttachmentsService,
      });

      expect(result.nextInput.attachments).toHaveLength(1);
      expect(result.nextInput.attachments[0]).toEqual({
        attachment: {
          ...attachment,
          id: 'generated-id-1',
        },
        representation: mockRepresentation,
      });

      expect(mockGetToolResultId).toHaveBeenCalledTimes(1);
      expect(mockAttachmentsService.format).toHaveBeenCalledWith(attachment);
    });

    it('should preserve existing ID for attachment with ID', async () => {
      const attachment: AttachmentInput = {
        id: 'existing-id',
        type: 'text',
        data: { content: 'test content' },
      };

      const mockRepresentation: AttachmentRepresentation = {
        type: 'text',
        value: 'formatted text',
      };

      mockAttachmentsService.format.mockResolvedValue(mockRepresentation);

      const nextInput: RawRoundInput = {
        message: 'Hello',
        attachments: [attachment],
      };

      const result = await prepareConversation({
        previousRounds: [],
        nextInput,
        attachmentsService: mockAttachmentsService,
      });

      expect(result.nextInput.attachments[0]).toEqual({
        attachment: {
          ...attachment,
          id: 'existing-id',
        },
        representation: mockRepresentation,
      });

      expect(mockGetToolResultId).not.toHaveBeenCalled();
      expect(mockAttachmentsService.format).toHaveBeenCalledWith(attachment);
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

      const mockRepresentation1: AttachmentRepresentation = {
        type: 'text',
        value: 'formatted 1',
      };

      const mockRepresentation2: AttachmentRepresentation = {
        type: 'text',
        value: 'formatted 2',
      };

      const mockRepresentation3: AttachmentRepresentation = {
        type: 'text',
        value: 'formatted 3',
      };

      mockAttachmentsService.format
        .mockResolvedValueOnce(mockRepresentation1)
        .mockResolvedValueOnce(mockRepresentation2)
        .mockResolvedValueOnce(mockRepresentation3);

      const nextInput: RawRoundInput = {
        message: 'Hello',
        attachments: [attachment1, attachment2, attachment3],
      };

      const result = await prepareConversation({
        previousRounds: [],
        nextInput,
        attachmentsService: mockAttachmentsService,
      });

      expect(result.nextInput.attachments).toHaveLength(3);
      expect(result.nextInput.attachments[0]).toEqual({
        attachment: { ...attachment1, id: 'generated-id-1' },
        representation: mockRepresentation1,
      });
      expect(result.nextInput.attachments[1]).toEqual({
        attachment: { ...attachment2, id: 'existing-id' },
        representation: mockRepresentation2,
      });
      expect(result.nextInput.attachments[2]).toEqual({
        attachment: { ...attachment3, id: 'generated-id-2' },
        representation: mockRepresentation3,
      });

      expect(mockGetToolResultId).toHaveBeenCalledTimes(2);
      expect(mockAttachmentsService.format).toHaveBeenCalledTimes(3);
    });

    it('should preserve attachment properties', async () => {
      const attachment: AttachmentInput = {
        type: 'text',
        data: { content: 'test' },
        hidden: true,
      };

      const mockRepresentation: AttachmentRepresentation = {
        type: 'text',
        value: 'formatted',
      };

      mockAttachmentsService.format.mockResolvedValue(mockRepresentation);

      const nextInput: RawRoundInput = {
        message: 'Hello',
        attachments: [attachment],
      };

      const result = await prepareConversation({
        previousRounds: [],
        nextInput,
        attachmentsService: mockAttachmentsService,
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
      const previousRounds: ConversationRound[] = [
        {
          id: 'round-1',
          input: {
            message: 'Previous message',
          },
          steps: [],
          response: {
            message: 'Response',
          },
        },
      ];

      const result = await prepareConversation({
        previousRounds,
        nextInput: { message: 'New message' },
        attachmentsService: mockAttachmentsService,
      });

      expect(result.previousRounds).toHaveLength(1);
      expect(result.previousRounds[0]).toEqual({
        id: 'round-1',
        input: {
          message: 'Previous message',
          attachments: [],
        },
        steps: [],
        response: {
          message: 'Response',
        },
      });
    });

    it('should process previous rounds with attachments', async () => {
      const attachment: Attachment = {
        id: 'prev-attachment-id',
        type: 'text',
        data: { content: 'previous content' },
      };

      const mockRepresentation: AttachmentRepresentation = {
        type: 'text',
        value: 'formatted previous',
      };

      mockAttachmentsService.format.mockResolvedValue(mockRepresentation);

      const previousRounds: ConversationRound[] = [
        {
          id: 'round-1',
          input: {
            message: 'Previous message',
            attachments: [attachment],
          },
          steps: [],
          response: {
            message: 'Response',
          },
        },
      ];

      const result = await prepareConversation({
        previousRounds,
        nextInput: { message: 'New message' },
        attachmentsService: mockAttachmentsService,
      });

      expect(result.previousRounds[0].input.attachments).toHaveLength(1);
      expect(result.previousRounds[0].input.attachments[0]).toEqual({
        attachment: {
          ...attachment,
          id: 'prev-attachment-id',
        },
        representation: mockRepresentation,
      });

      expect(mockAttachmentsService.format).toHaveBeenCalledWith(attachment);
    });

    it('should process multiple previous rounds', async () => {
      const mockRepresentation: AttachmentRepresentation = {
        type: 'text',
        value: 'formatted',
      };

      mockAttachmentsService.format.mockResolvedValue(mockRepresentation);

      const previousRounds: ConversationRound[] = [
        {
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
          steps: [],
          response: { message: 'Response 1' },
        },
        {
          id: 'round-2',
          input: {
            message: 'Message 2',
          },
          steps: [],
          response: { message: 'Response 2' },
        },
        {
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
          steps: [],
          response: { message: 'Response 3' },
        },
      ];

      const result = await prepareConversation({
        previousRounds,
        nextInput: { message: 'New message' },
        attachmentsService: mockAttachmentsService,
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
      const previousRounds: ConversationRound[] = [
        {
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
        },
      ];

      const result = await prepareConversation({
        previousRounds,
        nextInput: { message: 'New message' },
        attachmentsService: mockAttachmentsService,
      });

      expect(result.previousRounds[0]).toEqual({
        id: 'round-1',
        input: {
          message: 'Message 1',
          attachments: [],
        },
        steps: previousRounds[0].steps,
        response: previousRounds[0].response,
        trace_id: 'trace-123',
      });
    });
  });

  describe('complex scenarios', () => {
    it('should process both previousRounds and nextInput with attachments', async () => {
      const mockRepresentation: AttachmentRepresentation = {
        type: 'text',
        value: 'formatted',
      };

      mockAttachmentsService.format.mockResolvedValue(mockRepresentation);

      const previousRounds: ConversationRound[] = [
        {
          id: 'round-1',
          input: {
            message: 'Previous',
            attachments: [
              {
                id: 'prev-id',
                type: 'text',
                data: { content: 'prev' },
              },
            ],
          },
          steps: [],
          response: { message: 'Response' },
        },
      ];

      const nextInput: RawRoundInput = {
        message: 'Next',
        attachments: [
          {
            type: 'text',
            data: { content: 'next' },
          },
        ],
      };

      const result = await prepareConversation({
        previousRounds,
        nextInput,
        attachmentsService: mockAttachmentsService,
      });

      expect(result.previousRounds[0].input.attachments).toHaveLength(1);
      expect(result.previousRounds[0].input.attachments[0].attachment.id).toBe('prev-id');

      expect(result.nextInput.attachments).toHaveLength(1);
      expect(result.nextInput.attachments[0].attachment.id).toBe('generated-id-1');

      expect(mockAttachmentsService.format).toHaveBeenCalledTimes(2);
      expect(mockGetToolResultId).toHaveBeenCalledTimes(1);
    });

    it('should handle attachments service returning different representations', async () => {
      const attachment1: AttachmentInput = {
        type: 'text',
        data: { content: 'short text' },
      };

      const attachment2: AttachmentInput = {
        type: 'text',
        data: { content: 'long text content that gets formatted differently' },
      };

      const mockRepresentation1: AttachmentRepresentation = {
        type: 'text',
        value: 'Short representation',
      };

      const mockRepresentation2: AttachmentRepresentation = {
        type: 'text',
        value: 'Longer formatted representation with more detail',
      };

      mockAttachmentsService.format
        .mockResolvedValueOnce(mockRepresentation1)
        .mockResolvedValueOnce(mockRepresentation2);

      const nextInput: RawRoundInput = {
        message: 'Message',
        attachments: [attachment1, attachment2],
      };

      const result = await prepareConversation({
        previousRounds: [],
        nextInput,
        attachmentsService: mockAttachmentsService,
      });

      expect(result.nextInput.attachments[0].representation).toEqual(mockRepresentation1);
      expect(result.nextInput.attachments[1].representation).toEqual(mockRepresentation2);
    });
  });
});
