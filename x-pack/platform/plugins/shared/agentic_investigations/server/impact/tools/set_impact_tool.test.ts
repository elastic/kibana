/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  AgentBuilderPluginSetup,
  ToolHandlerContext,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { IMPACT_ATTACHMENT_TYPE } from '../../../common/impact/attachment';
import { SET_IMPACT_TOOL_ID } from '../../../common/impact/constants';
import type { InvestigationEvidence } from '../../../common/evidence';
import { createInMemoryStorage } from '../../investigation_attachments/in_memory_storage.mock';
import { registerImpactAttachment } from '../attachments';
import type { InvestigationsPrivilegesChecker } from '../../investigations/services/check_investigations_privileges';
import { InvestigationsForbiddenError } from '../../investigations/services/investigations_forbidden_error';
import { impactDocumentId, ImpactService } from '../services/impact_service';
import type { ImpactDocument, ImpactStorageClient } from '../storage/impact_storage';
import {
  BOTH_IMPACT_FORMS_WARNING,
  createSetImpactTool,
  REMOVED_IMPACT_ATTACHMENT_NOTE,
  SINGLE_IMPACT_ENTITY_WARNING,
  type SetImpactToolParams,
} from './set_impact_tool';

const SPACE_ID = 'default';
const CONVERSATION_ID = 'conv-1';
const IMPACT_ID = impactDocumentId(SPACE_ID, CONVERSATION_ID);

const chartEvidence: InvestigationEvidence = {
  description: 'Errors rose after the deploy.',
  chart: {
    type: 'line',
    title: 'Error rate',
    x_axis: { type: 'time' },
    y_axis: { unit: 'percent' },
    series: [{ name: 'checkout', points: [{ x: '2026-07-28T14:00:00Z', y: 12 }] }],
  },
};

const setup = ({
  assertCanManage = jest.fn().mockResolvedValue(undefined),
}: { assertCanManage?: jest.Mock } = {}) => {
  const storage = createInMemoryStorage<ImpactDocument>();
  const service = new ImpactService({ storage: storage as unknown as ImpactStorageClient });

  const registerType = jest.fn();
  registerImpactAttachment(
    { attachments: { registerType } } as unknown as AgentBuilderPluginSetup,
    {
      getImpactService: () => service,
      privileges: { assertCanManage: jest.fn(), assertCanRead: jest.fn() },
      assertCanReadConversation: jest.fn().mockResolvedValue(undefined),
      logger: loggerMock.create(),
    }
  );
  const definition = registerType.mock.calls[0][0] as AttachmentTypeDefinition;
  const attachments = createAttachmentStateManager([], {
    getTypeDefinition: (type) => (type === IMPACT_ATTACHMENT_TYPE ? definition : undefined),
  });

  const privileges: InvestigationsPrivilegesChecker = {
    assertCanManage,
    assertCanRead: jest.fn(),
  };
  const tool = createSetImpactTool({
    getImpactService: () => service,
    resolveUser: jest.fn().mockResolvedValue({
      username: 'analyst',
      fullName: null,
      email: null,
    }),
    privileges,
    logger: loggerMock.create(),
  });

  const context = {
    request: httpServerMock.createKibanaRequest(),
    spaceId: SPACE_ID,
    attachments,
    runContext: {
      runId: 'run-1',
      stack: [{ type: 'agent', agentId: 'nightshift', conversationId: CONVERSATION_ID }],
    },
  } as unknown as ToolHandlerContext;

  const call = async (params: SetImpactToolParams) => {
    const { results } = (await tool.handler(params, context)) as ToolHandlerStandardReturn;
    return results[0];
  };

  return { storage, attachments, tool, call };
};

describe('investigations.set_impact', () => {
  it('is the allow-listed builtin tool id', () => {
    expect(setup().tool.id).toBe(SET_IMPACT_TOOL_ID);
  });

  it('writes the index and adds the by-reference impact attachment', async () => {
    const { storage, attachments, call } = setup();

    const result = await call({
      summary: 'Checkout failed for 12% of users',
      evidence: chartEvidence,
    });

    expect(result).toMatchObject({
      type: ToolResultType.other,
      data: { acknowledged: true, attachment_id: IMPACT_ID },
    });
    expect(result.data).not.toHaveProperty('warning');
    expect(storage.entries.get(IMPACT_ID)?.source).toMatchObject({
      summary: 'Checkout failed for 12% of users',
      evidence: chartEvidence,
      createdBy: { username: 'analyst' },
    });
    expect(attachments.getAttachmentRecord(IMPACT_ID)).toMatchObject({
      type: IMPACT_ATTACHMENT_TYPE,
      origin: IMPACT_ID,
      readonly: true,
      active: true,
      hidden: true,
    });
    expect(attachments.drainChanges()).toEqual([]);
  });

  it('keeps omitted fields, replaces sent ones, and versions the attachment', async () => {
    const { storage, attachments, call } = setup();
    await call({ summary: 'First', evidence: chartEvidence });

    await call({ summary: 'Second' });

    expect(storage.entries.get(IMPACT_ID)?.source).toMatchObject({
      summary: 'Second',
      evidence: chartEvidence,
    });
    const record = attachments.getAttachmentRecord(IMPACT_ID);
    expect(record?.current_version).toBe(2);
    expect(record?.versions[1].data).toMatchObject({ summary: 'Second', evidence: chartEvidence });
  });

  it('defaults entity ids to names and maps snake_case fields', async () => {
    const { storage, call } = setup();

    await call({
      summary: 'Two services degraded differently',
      entities: [
        { name: 'checkout', type: 'service', feature_id: 'ki-1', evidence: chartEvidence },
        { id: 'svc-pay', name: 'payments', stream_name: 'logs.payments' },
      ],
    });

    expect(storage.entries.get(IMPACT_ID)?.source.entities).toEqual([
      {
        id: 'checkout',
        name: 'checkout',
        type: 'service',
        featureId: 'ki-1',
        evidence: chartEvidence,
      },
      { id: 'svc-pay', name: 'payments', streamName: 'logs.payments' },
    ]);
  });

  it('clears entities with an empty list', async () => {
    const { storage, call } = setup();
    await call({ entities: [{ name: 'checkout' }, { name: 'payments' }] });

    await call({ entities: [] });

    expect(storage.entries.get(IMPACT_ID)?.source).not.toHaveProperty('entities');
  });

  it('warns about a single finalized entity', async () => {
    const { call } = setup();

    const result = await call({
      summary: 'Checkout failed',
      entities: [{ name: 'checkout', evidence: chartEvidence }],
    });

    expect(result.data).toMatchObject({ warning: SINGLE_IMPACT_ENTITY_WARNING });
  });

  it('does not warn about a single seeded entity without evidence', async () => {
    const { call } = setup();

    const result = await call({ entities: [{ name: 'checkout' }] });

    expect(result.data).not.toHaveProperty('warning');
  });

  it('warns when the stored impact has both evidence forms', async () => {
    const { call } = setup();
    await call({ evidence: chartEvidence });

    const result = await call({ entities: [{ name: 'checkout' }, { name: 'payments' }] });

    expect(result.data).toMatchObject({ warning: BOTH_IMPACT_FORMS_WARNING });
  });

  it('clears the warning once the agent removes the evidence it no longer wants', async () => {
    const { storage, attachments, call } = setup();
    await call({ summary: 'Checkout failed', evidence: chartEvidence });
    const stuck = await call({ entities: [{ name: 'checkout' }, { name: 'payments' }] });
    expect(stuck.data).toMatchObject({ warning: BOTH_IMPACT_FORMS_WARNING });

    const corrected = await call({ evidence: null });

    expect(corrected.data).not.toHaveProperty('warning');
    expect(storage.entries.get(IMPACT_ID)?.source).not.toHaveProperty('evidence');
    expect(storage.entries.get(IMPACT_ID)?.source).toMatchObject({ summary: 'Checkout failed' });
    expect(attachments.getAttachmentRecord(IMPACT_ID)?.versions.at(-1)?.data).not.toHaveProperty(
      'evidence'
    );
  });

  it('removes the summary with null', async () => {
    const { storage, call } = setup();
    await call({ summary: 'Checkout failed', entities: [{ name: 'a' }, { name: 'b' }] });

    await call({ summary: null });

    expect(storage.entries.get(IMPACT_ID)?.source).not.toHaveProperty('summary');
    expect(storage.entries.get(IMPACT_ID)?.source.entities).toHaveLength(2);
  });

  it('does not re-add an attachment the user removed', async () => {
    const { attachments, storage, call } = setup();
    await call({ summary: 'First' });
    attachments.delete(IMPACT_ID);

    const result = await call({ summary: 'Second' });

    expect(result.data).toMatchObject({ warning: REMOVED_IMPACT_ATTACHMENT_NOTE });
    expect(attachments.getAttachmentRecord(IMPACT_ID)?.active).toBe(false);
    expect(storage.entries.get(IMPACT_ID)?.source.summary).toBe('Second');
  });

  it('refuses an empty call', async () => {
    const { storage, call } = setup();

    const result = await call({});

    expect(result.type).toBe(ToolResultType.error);
    expect(storage.entries.size).toBe(0);
  });

  it('does not write without the investigations manage privilege', async () => {
    const { storage, call } = setup({
      assertCanManage: jest
        .fn()
        .mockRejectedValue(
          new InvestigationsForbiddenError('Missing privilege manage_investigations')
        ),
    });

    const result = await call({ summary: 'Checkout failed' });

    expect(result).toMatchObject({
      type: ToolResultType.error,
      data: { message: 'Missing privilege manage_investigations' },
    });
    expect(storage.entries.size).toBe(0);
  });
});
