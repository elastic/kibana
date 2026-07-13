/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import { generateDashboardTool } from './generate_dashboard_tool';

jest.mock('./core', () => ({
  executeDashboardOperations: jest.fn().mockResolvedValue({
    dashboardData: { title: 'My dashboard', description: undefined, panels: [] },
    failures: [],
  }),
  getErrorMessage: (error: Error) => error.message,
  hasValidCreateMetadataOperations: jest.fn().mockReturnValue(true),
  createVisPanelResolver: jest.fn(),
}));

jest.mock('./time_range', () => ({
  applyDefaultDashboardTimeRange: jest.fn().mockImplementation(({ dashboardData: d }) => d),
}));

describe('generateDashboardTool', () => {
  const logger = { error: jest.fn(), info: jest.fn() } as any;

  const buildAttachments = (existingRecord?: unknown) => ({
    getAttachmentRecord: jest.fn().mockReturnValue(existingRecord),
    add: jest.fn().mockResolvedValue({ id: 'new-id', current_version: 1 }),
    update: jest.fn().mockResolvedValue({ id: 'existing-id', current_version: 2 }),
  });

  const runHandler = async (attachments: ReturnType<typeof buildAttachments>, input: any) => {
    const tool = generateDashboardTool();
    return tool.handler(input, {
      logger,
      attachments: attachments as any,
      events: {} as any,
      esClient: {} as any,
      modelProvider: {} as any,
    } as any);
  };

  it('tags a new dashboard attachment as agent-authored', async () => {
    const attachments = buildAttachments(undefined);

    await runHandler(attachments, {
      operations: [{ operation: 'set_metadata', title: 'My dashboard' }],
    });

    expect(attachments.add).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ title: 'My dashboard' }) }),
      ATTACHMENT_REF_ACTOR.agent
    );
  });

  it('tags an updated dashboard attachment as agent-authored', async () => {
    const attachments = buildAttachments({
      type: DASHBOARD_ATTACHMENT_TYPE,
      current_version: 1,
      versions: [{ version: 1, data: { title: 'My dashboard', panels: [] } }],
    });

    await runHandler(attachments, {
      dashboardAttachmentId: 'existing-id',
      operations: [{ operation: 'add_panels', panels: [] }],
    });

    expect(attachments.update).toHaveBeenCalledWith(
      'existing-id',
      expect.objectContaining({ data: expect.objectContaining({ title: 'My dashboard' }) }),
      ATTACHMENT_REF_ACTOR.agent
    );
  });
});
