/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import type { ImprovementsServiceApi } from '@kbn/context-engine-plugin/server/improvements/service';
import { AI_INDEX_ATTACHMENT_TYPE } from '../../../../common/agent_builder_attachments';
import { proposeImprovementsHandler } from './handler';

const mockAssertWriteAccess = jest.fn();

jest.mock('../../assert_context_engine_write_access', () => ({
  assertContextEngineWriteAccess: (...args: unknown[]) => mockAssertWriteAccess(...args),
}));

const buildProposal = (overrides: Record<string, unknown> = {}) => ({
  action: 'add_source',
  title: 'Draw on the billing index',
  rationale: 'The user asked for refund answers and nothing here covers billing.',
  target: { subject: 'billing-*' },
  payload: { source: { type: 'esql', value: 'FROM billing-*' } },
  ...overrides,
});

describe('proposeImprovementsHandler', () => {
  let improvementsService: jest.Mocked<Pick<ImprovementsServiceApi, 'write'>>;
  let aiIndexService: { get: jest.Mock };

  const attachments = {
    getAll: () => [
      {
        id: 'ai-index-attachment',
        type: AI_INDEX_ATTACHMENT_TYPE,
        current_version: 1,
        versions: [{ version: 1, data: { id: 'orders' } }],
      },
    ],
  } as unknown as AttachmentStateManager;

  const run = (params: { aiIndexId?: string; improvements: unknown[] }) =>
    proposeImprovementsHandler({
      params,
      request: httpServerMock.createKibanaRequest(),
      spaceId: 'default',
      attachments,
      toolCallId: 'call-1',
      esClient: {} as never,
      logger: loggingSystemMock.createLogger(),
      getAiIndexService: async () => aiIndexService as unknown as AiIndexService,
      getImprovementsService: async () => improvementsService as unknown as ImprovementsServiceApi,
      getCoreStart: async () => ({} as never),
      getSecurityStart: async () => undefined,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAssertWriteAccess.mockResolvedValue(undefined);
    improvementsService = {
      write: jest.fn(async (inputs) => inputs.map((input) => ({ ...input } as never))),
    };
    aiIndexService = {
      get: jest.fn().mockResolvedValue({
        id: 'orders',
        feedback_analysis: { allowed_actions: ['add_source', 'add_workflow'] },
      }),
    };
  });

  it('records what the agent proposed against the attached AI index', async () => {
    const result = await run({ improvements: [buildProposal()] });

    expect(result.aiIndexId).toBe('orders');
    expect(result.recorded).toEqual([
      expect.objectContaining({ action: 'add_source', title: 'Draw on the billing index' }),
    ]);
  });

  it('records it as suggested, so nothing is applied without review', async () => {
    await run({ improvements: [buildProposal()] });

    const [[[written]]] = improvementsService.write.mock.calls;
    expect(written).toMatchObject({ ai_index_id: 'orders', status: 'suggested' });
  });

  it('marks the provenance as a conversation rather than inventing a signal window', async () => {
    await run({ improvements: [buildProposal()] });

    const [[[written]]] = improvementsService.write.mock.calls;
    expect(written.provenance).toEqual({ agent_run_id: 'call-1', origin: 'conversation' });
  });

  it('refuses an action the AI index does not permit, and says which', async () => {
    const result = await run({
      improvements: [buildProposal(), buildProposal({ action: 'remove_ki', target: { ki_id: 'k1' } })],
    });

    expect(result.recorded).toHaveLength(1);
    expect(result.skipped).toEqual([
      expect.objectContaining({ action: 'remove_ki', reason: 'action_not_allowed' }),
    ]);
  });

  it('reads the policy off the index rather than trusting the caller', async () => {
    aiIndexService.get.mockResolvedValue({ id: 'orders', feedback_analysis: { allowed_actions: [] } });

    const result = await run({ improvements: [buildProposal()] });

    expect(result.recorded).toEqual([]);
    expect(improvementsService.write).toHaveBeenCalledWith([]);
  });

  it('checks write access before touching anything', async () => {
    mockAssertWriteAccess.mockRejectedValue(new Error('Insufficient privileges'));

    await expect(run({ improvements: [buildProposal()] })).rejects.toThrow(
      'Insufficient privileges'
    );
    expect(improvementsService.write).not.toHaveBeenCalled();
  });

  it('explains itself when the conversation has no AI index to propose against', async () => {
    const noAttachments = { getAll: () => [] } as unknown as AttachmentStateManager;

    await expect(
      proposeImprovementsHandler({
        params: { improvements: [buildProposal()] },
        request: httpServerMock.createKibanaRequest(),
        spaceId: 'default',
        attachments: noAttachments,
        toolCallId: 'call-1',
        esClient: {} as never,
        logger: loggingSystemMock.createLogger(),
        getAiIndexService: async () => aiIndexService as unknown as AiIndexService,
        getImprovementsService: async () =>
          improvementsService as unknown as ImprovementsServiceApi,
        getCoreStart: async () => ({} as never),
        getSecurityStart: async () => undefined,
      })
    ).rejects.toThrow('No ai_index attachment found in this conversation');
  });
});
