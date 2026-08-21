/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound, ConverseInput, RoundInput } from '@kbn/agent-builder-common';
import {
  ConversationRoundStatus,
  ConversationRoundStepType,
  ToolResultType,
  isBadRequestError,
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
    mockContext.attachmentStateManager = createAttachmentStateManager([], {
      getTypeDefinition: (type: string) => ({
        id: type,
        validate: (input: unknown) => ({ valid: true, data: input }),
        format: () => ({ getRepresentation: () => ({ type: 'text', value: '' }) }),
      }),
    });

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
      mockContext.attachmentStateManager = createAttachmentStateManager([], {
        getTypeDefinition: (type: string) => ({
          id: type,
          validate: (input: unknown) => ({ valid: true, data: input }),
          format: () => ({ getRepresentation: () => ({ type: 'text', value: '' }) }),
        }),
      });

      // We only need getTypeDefinition for attachmentTypes; it won't be used for formatting since we strip.
      mockAttachmentsService.getTypeDefinition.mockReturnValue({
        id: 'text',
        validate: jest.fn(),
        format: jest.fn(),
        getAgentDescription: () => 'desc',
      });

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
      expect(result.nextInput.attachment_refs).toHaveLength(1);
      expect(result.nextInput.attachment_refs![0]).toMatchObject({
        actor: 'user',
        attachment_id: 'a-1',
        operation: 'created',
        version: 1,
      });
      expect(result.nextInput.attachment_refs![0].version).toBe(1);
      expect(result.attachmentStateManager.getAll()).toHaveLength(1); // promoted
      expect(result.attachmentStateManager.getAll()[0]).toMatchObject({
        id: 'a-1',
        type: 'text',
        current_version: 1,
      });
      expect(result.attachmentTypes.map((t) => t.type)).toEqual(['text']);
    });

    it('sets attachment_context on nextInput and includes attachment type in conversation attachmentTypes when promoted from legacy attachments array', async () => {
      mockContext.attachmentStateManager = createAttachmentStateManager([], {
        getTypeDefinition: (type: string) => ({
          id: type,
          validate: (input: unknown) => ({ valid: true as const, data: input }),
          format: () => ({ getRepresentation: () => ({ type: 'text', value: '' }) }),
        }),
      });
      mockAttachmentsService.getTypeDefinition.mockReturnValue({
        id: 'text',
        validate: jest.fn(),
        format: jest.fn(),
        getAgentDescription: () => 'A text attachment type',
      });

      const result = await prepareConversation({
        previousRounds: [],
        nextInput: {
          message: 'I uploaded a note',
          attachments: [{ id: 'note-1', type: 'text', data: { content: 'hello' } }],
        },
        context: mockContext,
      });

      // attachment_context should contain the 'were added' block with the attachment metadata
      expect(result.nextInput.attachment_context).toBeDefined();
      expect(result.nextInput.attachment_context).toContain('<attachments count="1">');
      expect(result.nextInput.attachment_context).toContain('attachment_id="note-1"');

      // attachment type description is surfaced at conversation level, not per-round
      expect(result.attachmentTypes).toEqual([
        { type: 'text', description: 'A text attachment type' },
      ]);
    });

    it('treats same ID as a new version of an existing attachment and sets an updated attachment_ref', async () => {
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

      mockContext.attachmentStateManager = createAttachmentStateManager([existing], {
        getTypeDefinition: (type: string) => ({
          id: type,
          validate: (input: unknown) => ({ valid: true, data: input }),
          format: () => ({ getRepresentation: () => ({ type: 'text', value: '' }) }),
        }),
      });
      mockAttachmentsService.getTypeDefinition.mockReturnValue({
        id: 'text',
        validate: jest.fn(),
        format: jest.fn(),
        getAgentDescription: () => 'desc',
      });

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

      expect(result.nextInput.attachment_refs).toHaveLength(1);
      expect(result.nextInput.attachment_refs![0]).toMatchObject({
        actor: 'user',
        attachment_id: 'a-1',
        operation: 'updated',
        version: 2,
      });
    });

    it('merges explicit attachment_refs with refs generated by promoting legacy attachments', async () => {
      // Client sends both attachment_refs (a pre-existing v2 ref) and attachments (a brand-new one).
      // The result should contain both — neither should be silently dropped.
      const existing: VersionedAttachment = {
        id: 'pre-existing',
        type: 'text',
        active: true,
        current_version: 1,
        versions: [
          {
            version: 1,
            data: { content: 'already there' },
            created_at: '2024-01-01T00:00:00.000Z',
            content_hash: 'hash-existing',
            estimated_tokens: 1,
          },
        ],
      };

      mockContext.attachmentStateManager = createAttachmentStateManager([existing], {
        getTypeDefinition: (type: string) => ({
          id: type,
          validate: (input: unknown) => ({ valid: true, data: input }),
          format: () => ({ getRepresentation: () => ({ type: 'text', value: '' }) }),
        }),
      });
      mockAttachmentsService.getTypeDefinition.mockReturnValue({
        id: 'text',
        validate: jest.fn(),
        format: jest.fn(),
        getAgentDescription: () => 'desc',
      });

      const nextInput: ConverseInput = {
        message: 'Hello',
        attachment_refs: [
          { attachment_id: 'pre-existing', version: 1, operation: 'read', actor: 'user' as const },
        ],
        attachments: [{ id: 'new-one', type: 'text', data: { content: 'brand new' } }],
      };

      const result = await prepareConversation({
        previousRounds: [],
        nextInput,
        context: mockContext,
      });

      expect(result.nextInput.attachment_refs).toHaveLength(2);
      const refIds = result.nextInput.attachment_refs!.map((r) => r.attachment_id);
      expect(refIds).toContain('pre-existing');
      expect(refIds).toContain('new-one');

      const newRef = result.nextInput.attachment_refs!.find((r) => r.attachment_id === 'new-one');
      expect(newRef).toMatchObject({ operation: 'created', version: 1, actor: 'user' });

      const existingRef = result.nextInput.attachment_refs!.find(
        (r) => r.attachment_id === 'pre-existing'
      );
      expect(existingRef).toMatchObject({ operation: 'read', version: 1, actor: 'user' });
    });

    it('refreshes origin_snapshot_at only for existing by-reference attachments in nextInput', async () => {
      const existing: VersionedAttachment = {
        id: 'a-1',
        type: 'text',
        active: true,
        current_version: 1,
        origin: 'so-1',
        origin_snapshot_at: '2024-01-01T00:00:00.000Z',
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

      mockContext.attachmentStateManager = createAttachmentStateManager([existing], {
        getTypeDefinition: (type: string) => ({
          id: type,
          validate: (input: unknown) => ({ valid: true, data: input }),
          validateOrigin: (input: unknown) => ({ valid: true, data: input }),
          format: () => ({ getRepresentation: () => ({ type: 'text', value: '' }) }),
        }),
      });
      mockAttachmentsService.getTypeDefinition.mockReturnValue({
        id: 'text',
        validate: jest.fn(),
        format: jest.fn(),
        getAgentDescription: () => 'desc',
      });

      const nextInput: ConverseInput = {
        message: 'Hello',
        attachments: [{ id: 'a-1', type: 'text', data: { content: 'v2' } }],
      };

      const result = await prepareConversation({
        previousRounds: [],
        nextInput,
        context: mockContext,
      });

      const updated = result.attachmentStateManager.getAttachmentRecord('a-1');
      expect(updated).toBeDefined();
      expect(updated?.current_version).toBe(2);
      expect(updated?.origin).toEqual(existing.origin);
      expect(updated?.origin_snapshot_at).toBeDefined();
      expect(updated?.origin_snapshot_at).not.toBe(existing.origin_snapshot_at);
    });
  });

  describe('previousRounds with attachments', () => {
    it('does not refresh origin_snapshot_at when existing by-reference attachment is only promoted from previous rounds', async () => {
      const existing: VersionedAttachment = {
        id: 'a-1',
        type: 'text',
        active: true,
        current_version: 1,
        origin: 'so-1',
        origin_snapshot_at: '2024-01-01T00:00:00.000Z',
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

      mockContext.attachmentStateManager = createAttachmentStateManager([existing], {
        getTypeDefinition: (type: string) => ({
          id: type,
          validate: (input: unknown) => ({ valid: true, data: input }),
          validateOrigin: (input: unknown) => ({ valid: true, data: input }),
          format: () => ({ getRepresentation: () => ({ type: 'text', value: '' }) }),
        }),
      });
      mockAttachmentsService.getTypeDefinition.mockReturnValue({
        id: 'text',
        validate: jest.fn(),
        format: jest.fn(),
        getAgentDescription: () => 'desc',
      });

      const previousRounds: ConversationRound[] = [
        createRound({
          id: 'round-1',
          input: {
            message: 'Previous message',
            attachments: [{ id: 'a-1', type: 'text', data: { content: 'v2' } }],
          },
        }),
      ];

      const result = await prepareConversation({
        previousRounds,
        nextInput: { message: 'New message' },
        context: mockContext,
      });

      const updated = result.attachmentStateManager.getAttachmentRecord('a-1');
      expect(updated).toBeDefined();
      expect(updated?.current_version).toBe(2);
      expect(updated?.origin_snapshot_at).toBe(existing.origin_snapshot_at);
    });

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
      expect(result.previousRounds[0].input.attachment_refs).toBeDefined();
      expect(result.previousRounds[0].input.attachment_refs).toHaveLength(1);
      // Attachment migrated to ref so we can render metadata with round
      expect(result.previousRounds[0].input.attachment_refs![0]).toMatchObject({
        attachment_id: attachment.id,
        operation: 'created',
        actor: 'user',
        version: 1,
      });
    });

    it("preserves a previous round's attachment_refs and attachment_context verbatim (never recomputed)", async () => {
      // These fields are computed once, at round-completion time
      // (add_round_complete_event.ts), and must be carried through unchanged here —
      // recomputing attachment_context from current attachment state for a historical
      // round would leak later edits (e.g. a changed description) back into that
      // round's already-cached message text.
      const previousRounds = [
        createRound({
          id: 'round-1',
          input: {
            message: 'Previous message',
            attachment_refs: [
              { attachment_id: 'a-1', version: 1, operation: 'created', actor: 'user' as const },
            ],
            attachment_context:
              '<attachments count="1"><attachment attachment_id="a-1"/></conversation-attachments>',
          },
        }),
      ];

      const result = await prepareConversation({
        previousRounds,
        nextInput: { message: 'New message' },
        context: mockContext,
      });

      // type is undefined because a-1 was never added to the state manager for this conversation
      expect(result.previousRounds[0].input.attachment_refs).toEqual([
        { attachment_id: 'a-1', version: 1, operation: 'created', actor: 'user', type: undefined },
      ]);
      expect(result.previousRounds[0].input.attachment_context).toBe(
        '<attachments count="1"><attachment attachment_id="a-1"/></conversation-attachments>'
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

  describe('ProcessedAttachmentVersionRef type field and conversation attachmentTypes', () => {
    const makeStateManager = (attachments: VersionedAttachment[]) =>
      createAttachmentStateManager(attachments, {
        getTypeDefinition: (type: string) => ({
          id: type,
          validate: (input: unknown) => ({ valid: true, data: input }),
          format: () => ({ getRepresentation: () => ({ type: 'text', value: '' }) }),
        }),
      });

    it('leaves attachment_refs undefined and attachmentTypes empty when there are no attachment_refs', async () => {
      const result = await prepareConversation({
        previousRounds: [createRound({ input: { message: 'Previous' } })],
        nextInput: { message: 'Hello' },
        context: mockContext,
      });

      expect(result.previousRounds[0].input.attachment_refs).toBeUndefined();
      expect(result.nextInput.attachment_refs).toBeUndefined();
      expect(result.attachmentTypes).toEqual([]);
    });

    it('sets type on attachment_refs from the state manager and includes that type in conversation attachmentTypes', async () => {
      mockContext.attachmentStateManager = makeStateManager([
        {
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
        },
      ]);
      mockAttachmentsService.getTypeDefinition.mockReturnValue({
        id: 'text',
        validate: jest.fn(),
        format: jest.fn(),
        getAgentDescription: () => 'A text attachment type',
      });

      const result = await prepareConversation({
        previousRounds: [
          createRound({
            input: {
              message: 'Previous',
              attachment_refs: [
                { attachment_id: 'a-1', version: 1, operation: 'created', actor: 'user' as const },
              ],
            },
          }),
        ],
        nextInput: { message: 'New message' },
        context: mockContext,
      });

      expect(result.previousRounds[0].input.attachment_refs![0]).toMatchObject({
        attachment_id: 'a-1',
        type: 'text',
      });
      expect(result.nextInput.attachment_refs).toBeUndefined();
      expect(result.attachmentTypes).toEqual([
        { type: 'text', description: 'A text attachment type' },
      ]);
    });

    it('deduplicates types across rounds — all refs get type set, but attachmentTypes lists each type once', async () => {
      mockContext.attachmentStateManager = makeStateManager([
        {
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
        },
        {
          id: 'a-2',
          type: 'text',
          active: true,
          current_version: 1,
          versions: [
            {
              version: 1,
              data: { content: 'v2' },
              created_at: '2024-01-01T00:00:00.000Z',
              content_hash: 'hash-v2',
              estimated_tokens: 1,
            },
          ],
        },
      ]);
      mockAttachmentsService.getTypeDefinition.mockReturnValue({
        id: 'text',
        validate: jest.fn(),
        format: jest.fn(),
        getAgentDescription: () => 'A text attachment type',
      });

      const result = await prepareConversation({
        previousRounds: [
          createRound({
            input: {
              message: 'Round 1',
              attachment_refs: [
                { attachment_id: 'a-1', version: 1, operation: 'created', actor: 'user' as const },
              ],
            },
          }),
          createRound({
            input: {
              message: 'Round 2',
              attachment_refs: [
                { attachment_id: 'a-2', version: 1, operation: 'created', actor: 'user' as const },
              ],
            },
          }),
        ],
        nextInput: { message: 'New message' },
        context: mockContext,
      });

      // All refs get type set regardless of which round introduced the type first
      expect(result.previousRounds[0].input.attachment_refs![0]).toMatchObject({ type: 'text' });
      expect(result.previousRounds[1].input.attachment_refs![0]).toMatchObject({ type: 'text' });
      // 'text' appears in both rounds but is deduplicated to one entry
      expect(result.attachmentTypes).toEqual([
        { type: 'text', description: 'A text attachment type' },
      ]);
    });

    it('sets type on nextInput attachment_refs and includes the type in conversation attachmentTypes', async () => {
      mockContext.attachmentStateManager = makeStateManager([
        {
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
        },
      ]);
      mockAttachmentsService.getTypeDefinition.mockReturnValue({
        id: 'text',
        validate: jest.fn(),
        format: jest.fn(),
        getAgentDescription: () => 'A text attachment type',
      });

      const result = await prepareConversation({
        previousRounds: [],
        nextInput: {
          message: 'Hello',
          attachment_refs: [
            { attachment_id: 'a-1', version: 1, operation: 'created', actor: 'user' as const },
          ],
        },
        context: mockContext,
      });

      expect(result.nextInput.attachment_refs![0]).toMatchObject({
        attachment_id: 'a-1',
        type: 'text',
      });
      expect(result.attachmentTypes).toEqual([
        { type: 'text', description: 'A text attachment type' },
      ]);
    });

    it('deduplicates when the same type appears in both a previous round and nextInput', async () => {
      mockContext.attachmentStateManager = makeStateManager([
        {
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
        },
        {
          id: 'a-2',
          type: 'text',
          active: true,
          current_version: 2,
          versions: [
            {
              version: 1,
              data: { content: 'v1' },
              created_at: '2024-01-01T00:00:00.000Z',
              content_hash: 'hash-v2a',
              estimated_tokens: 1,
            },
            {
              version: 2,
              data: { content: 'v2' },
              created_at: '2024-06-01T00:00:00.000Z',
              content_hash: 'hash-v2b',
              estimated_tokens: 1,
            },
          ],
        },
      ]);
      mockAttachmentsService.getTypeDefinition.mockReturnValue({
        id: 'text',
        validate: jest.fn(),
        format: jest.fn(),
        getAgentDescription: () => 'A text attachment type',
      });

      const result = await prepareConversation({
        previousRounds: [
          createRound({
            input: {
              message: 'Round 1',
              attachment_refs: [
                { attachment_id: 'a-1', version: 1, operation: 'created', actor: 'user' as const },
              ],
            },
          }),
        ],
        nextInput: {
          message: 'Next message',
          attachment_refs: [
            { attachment_id: 'a-2', version: 2, operation: 'updated', actor: 'user' as const },
          ],
        },
        context: mockContext,
      });

      expect(result.previousRounds[0].input.attachment_refs![0]).toMatchObject({ type: 'text' });
      expect(result.nextInput.attachment_refs![0]).toMatchObject({ type: 'text' });
      // 'text' appears in both round and nextInput refs, but is deduplicated to one entry
      expect(result.attachmentTypes).toEqual([
        { type: 'text', description: 'A text attachment type' },
      ]);
    });

    it('includes all distinct types in attachmentTypes, each ref carrying its own type', async () => {
      mockContext.attachmentStateManager = makeStateManager([
        {
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
        },
        {
          id: 'a-2',
          type: 'image',
          active: true,
          current_version: 1,
          versions: [
            {
              version: 1,
              data: { url: 'img.png' },
              created_at: '2024-01-01T00:00:00.000Z',
              content_hash: 'hash-img',
              estimated_tokens: 1,
            },
          ],
        },
      ]);
      mockAttachmentsService.getTypeDefinition.mockImplementation((type) => ({
        id: type,
        validate: jest.fn(),
        format: jest.fn(),
        getAgentDescription: () => `A ${type} attachment`,
      }));

      const result = await prepareConversation({
        previousRounds: [
          createRound({
            input: {
              message: 'Round 1',
              attachment_refs: [
                { attachment_id: 'a-1', version: 1, operation: 'created', actor: 'user' as const },
              ],
            },
          }),
          createRound({
            input: {
              message: 'Round 2',
              attachment_refs: [
                { attachment_id: 'a-2', version: 1, operation: 'created', actor: 'user' as const },
              ],
            },
          }),
        ],
        nextInput: { message: 'New message' },
        context: mockContext,
      });

      expect(result.previousRounds[0].input.attachment_refs![0]).toMatchObject({ type: 'text' });
      expect(result.previousRounds[1].input.attachment_refs![0]).toMatchObject({ type: 'image' });
      expect(result.attachmentTypes).toEqual(
        expect.arrayContaining([
          { type: 'text', description: 'A text attachment' },
          { type: 'image', description: 'A image attachment' },
        ])
      );
      expect(result.attachmentTypes).toHaveLength(2);
    });
  });

  describe('action=regenerate', () => {
    it('throws a bad request error (400) when conversation has no rounds', async () => {
      await expect(
        prepareConversation({
          previousRounds: [],
          nextInput: { message: 'ignored' },
          context: mockContext,
          action: 'regenerate',
        })
      ).rejects.toThrow('Cannot regenerate: conversation has no rounds');

      let thrown: unknown;
      try {
        await prepareConversation({
          previousRounds: [],
          nextInput: { message: 'ignored' },
          context: mockContext,
          action: 'regenerate',
        });
      } catch (e) {
        thrown = e;
      }
      expect(isBadRequestError(thrown)).toBe(true);
    });

    it('uses the last round input and ignores nextInput from request', async () => {
      const lastRoundInput: RoundInput = {
        message: 'Original message',
        attachment_refs: [{ attachment_id: 'a-1', version: 1, actor: 'user' as const }],
      };
      const previousRounds = [
        createRound({
          id: 'round-1',
          input: lastRoundInput,
          response: { message: 'Response to regenerate' },
        }),
      ];

      const result = await prepareConversation({
        previousRounds,
        nextInput: { message: 'ignored by regenerate' },
        context: mockContext,
        action: 'regenerate',
      });

      // Strips the last round from previous rounds
      expect(result.previousRounds).toHaveLength(0);

      // Uses the last round's input (full spread preserves all fields for downstream)
      expect(result.nextInput.message).toBe('Original message');

      // The original round's attachment_refs must be preserved (merged), not dropped.
      // type is undefined because a-1 is not in the state manager for this conversation.
      expect(result.nextInput.attachment_refs).toEqual([
        { attachment_id: 'a-1', version: 1, actor: 'user', type: undefined },
      ]);
    });

    it('preserves a "created" attachment_ref through regenerate even though the reprocessing pass never re-triggers an add() for it', async () => {
      // Attachment 'a-1' already exists in the state manager (as if created by an
      // earlier, now-regenerated execution of this same round). Regenerating the round
      // replays its stored input, which carries no legacy `attachments` payload, so the
      // merge phase for nextInput has nothing to add/update — attachmentStateManager's
      // own access tracking alone would report zero refs. If prepare_conversation
      // replaced (rather than merged) attachment_refs with that fresh, empty tracking
      // result, the original "created" ref would be silently lost.
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
      mockContext.attachmentStateManager = createAttachmentStateManager([existing], {
        getTypeDefinition: (type: string) => ({
          id: type,
          validate: (input: unknown) => ({ valid: true, data: input }),
          format: () => ({ getRepresentation: () => ({ type: 'text', value: '' }) }),
        }),
      });

      const lastRoundInput: RoundInput = {
        message: 'Original message',
        attachment_refs: [
          { attachment_id: 'a-1', version: 1, operation: 'created', actor: 'user' as const },
        ],
      };
      const previousRounds = [
        createRound({
          id: 'round-1',
          input: lastRoundInput,
          response: { message: 'Response to regenerate' },
        }),
      ];

      const result = await prepareConversation({
        previousRounds,
        nextInput: { message: 'ignored by regenerate' },
        context: mockContext,
        action: 'regenerate',
      });

      // a-1 exists in the state manager with type 'text', so type is set on the ref.
      expect(result.nextInput.attachment_refs).toEqual([
        { attachment_id: 'a-1', version: 1, operation: 'created', actor: 'user', type: 'text' },
      ]);
    });
  });
});
