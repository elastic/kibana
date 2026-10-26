/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { isAllowedBuiltinTool } from '@kbn/agent-builder-server/allow_lists';
import type { SmlTypeDefinition } from '@kbn/agent-builder-sml-plugin/server';
import { AgentBuilderDashboardsPlugin } from './plugin';

const setupPlugin = (coreSetup = coreMock.createSetup()) => {
  const registerAttachmentType = jest.fn<void, [AttachmentTypeDefinition]>();
  const registerTool = jest.fn();
  const registerSkill = jest.fn();
  const registerSmlType = jest.fn<void, [SmlTypeDefinition]>();

  const plugin = new AgentBuilderDashboardsPlugin(coreMock.createPluginInitializerContext());

  plugin.setup(
    coreSetup as never,
    {
      agentBuilder: {
        attachments: { registerType: registerAttachmentType },
        tools: { register: registerTool },
        skills: { register: registerSkill },
      },
      agentBuilderSml: {
        registerType: registerSmlType,
      },
    } as never
  );

  return { registerAttachmentType, registerTool, registerSkill, registerSmlType };
};

describe('AgentBuilderDashboardsPlugin', () => {
  it('registers the dashboard attachment type, generate tool, skill, and SML type', () => {
    const { registerAttachmentType, registerTool, registerSkill, registerSmlType } = setupPlugin();

    expect(registerAttachmentType).toHaveBeenCalledTimes(1);
    expect(registerTool).toHaveBeenCalledTimes(1);
    expect(registerTool).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'platform.dashboard.generate_dashboard' })
    );
    expect(isAllowedBuiltinTool(registerTool.mock.calls[0][0].id)).toBe(true);
    expect(registerSkill).toHaveBeenCalledTimes(1);
    expect(registerSkill).toHaveBeenCalledWith(expect.objectContaining({ id: 'dashboards' }));
    expect(registerSmlType).toHaveBeenCalledTimes(1);
    expect(registerSmlType).toHaveBeenCalledWith(expect.objectContaining({ id: 'dashboard' }));
  });

  it('reads referenced dashboards the way the Dashboard app loads them', async () => {
    const read = jest.fn().mockResolvedValue({
      id: 'dashboard-1',
      data: { title: 'System Overview', panels: [] },
      meta: { outcome: 'exactMatch', version: 'v1' },
    });
    const { registerAttachmentType, registerSmlType } = setupPlugin(
      coreMock.createSetup({ pluginStartDeps: { dashboard: { client: { read } } } })
    );
    const [[attachmentType]] = registerAttachmentType.mock.calls;
    const [[smlType]] = registerSmlType.mock.calls;
    const savedObjectsClient = savedObjectsClientMock.create();
    const attachmentContext = { request: {} as never, spaceId: 'default', savedObjectsClient };
    const smlContext = {
      savedObjectsClient,
      esClient: {},
      logger: loggingSystemMock.createLogger(),
    } as never;

    await attachmentType.resolve?.('dashboard-1', attachmentContext);
    await attachmentType.isStale?.(
      { origin: 'dashboard-1', origin_snapshot_at: '2025-01-01T00:00:00.000Z' } as never,
      attachmentContext
    );
    await smlType.getSmlEntry('dashboard-1', smlContext);
    await smlType.toAttachment(
      { references: [{ uri: 'dashboard://dashboard-1', relation: 'derived_from' }] } as never,
      smlContext
    );

    const expectedReadArgs = [savedObjectsClient, 'dashboard-1', { isDashboardAppRequest: true }];
    expect(read.mock.calls).toEqual([
      expectedReadArgs,
      expectedReadArgs,
      expectedReadArgs,
      expectedReadArgs,
    ]);
  });
});
