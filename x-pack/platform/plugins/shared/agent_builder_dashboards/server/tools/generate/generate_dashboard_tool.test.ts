/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { DASHBOARD_UPDATED_UI_EVENT } from '../../../common';
import { retrieveLatestVersion } from './attachment_state';
import { executeDashboardOperations, hasValidCreateMetadataOperations } from './core';
import { generateDashboardTool } from './generate_dashboard_tool';

jest.mock('./attachment_state', () => ({ retrieveLatestVersion: jest.fn() }));
jest.mock('./core', () => ({
  ...jest.requireActual('./core'),
  executeDashboardOperations: jest.fn(),
  hasValidCreateMetadataOperations: jest.fn(),
  createVisPanelResolver: jest.fn(),
  createAttachmentPanelResolver: jest.fn(),
}));
jest.mock('./time_range', () => ({
  applyDefaultDashboardTimeRange: jest.fn(
    async ({ dashboardData }: { dashboardData: DashboardAttachmentData }) => ({
      ...dashboardData,
      time_range: { from: 'now-7d', to: 'now' },
    })
  ),
}));
jest.mock('@kbn/custom-content-server', () => ({
  createCustomContentTemplateResolver: jest.fn(),
}));

const mockRetrieveLatestVersion = retrieveLatestVersion as jest.MockedFunction<
  typeof retrieveLatestVersion
>;
const mockExecuteDashboardOperations = executeDashboardOperations as jest.MockedFunction<
  typeof executeDashboardOperations
>;
const mockHasValidCreateMetadataOperations =
  hasValidCreateMetadataOperations as jest.MockedFunction<typeof hasValidCreateMetadataOperations>;

const generatedDashboard: DashboardAttachmentData = { title: 'Agent dashboard', panels: [] };
const finalDashboard: DashboardAttachmentData = {
  ...generatedDashboard,
  time_range: { from: 'now-7d', to: 'now' },
};

const makeContext = () => {
  const sendUiEvent = jest.fn();
  const add = jest.fn(async ({ id }: { id: string }) => ({ id, current_version: 1 }));
  const update = jest.fn(async (id: string) => ({
    id,
    current_version: 2,
    origin: 'saved-dashboard-id',
  }));
  return {
    ctx: {
      logger: { info: jest.fn(), error: jest.fn() },
      attachments: { add, update },
      events: { sendUiEvent },
      esClient: {},
      modelProvider: {},
    },
    add,
    update,
    sendUiEvent,
  };
};

const callHandler = async (params: {
  dashboardAttachmentId?: string;
  operations: Array<Record<string, unknown>>;
}) => {
  const tool = generateDashboardTool();
  type HandlerParams = Parameters<typeof tool.handler>[0];
  type HandlerCtx = Parameters<typeof tool.handler>[1];
  const context = makeContext();
  const ret = await tool.handler(
    params as unknown as HandlerParams,
    context.ctx as unknown as HandlerCtx
  );
  if (!('results' in ret)) throw new Error('Unexpected HITL return from tool handler');
  return { results: ret.results, ...context };
};

describe('generateDashboardTool handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasValidCreateMetadataOperations.mockReturnValue(true);
    mockExecuteDashboardOperations.mockResolvedValue({
      dashboardData: generatedDashboard,
      failures: [],
      panelAuthoringNotes: [],
    } as unknown as Awaited<ReturnType<typeof executeDashboardOperations>>);
  });

  it('sends a dashboard updated UI event with the created attachment', async () => {
    mockRetrieveLatestVersion.mockReturnValue(undefined);

    const { add, sendUiEvent } = await callHandler({
      operations: [{ operation: 'set_metadata', title: 'Agent dashboard' }],
    });

    const createdId = add.mock.calls[0][0].id;
    expect(sendUiEvent).toHaveBeenCalledTimes(1);
    expect(sendUiEvent).toHaveBeenCalledWith(DASHBOARD_UPDATED_UI_EVENT, {
      attachment: {
        id: createdId,
        type: DASHBOARD_ATTACHMENT_TYPE,
        data: finalDashboard,
        origin: undefined,
      },
    });
  });

  it('sends a dashboard updated UI event with the updated attachment and its origin', async () => {
    mockRetrieveLatestVersion.mockReturnValue({
      version: 1,
      data: generatedDashboard,
    } as unknown as ReturnType<typeof retrieveLatestVersion>);

    const { update, sendUiEvent } = await callHandler({
      dashboardAttachmentId: 'dashboard-attachment-id',
      operations: [{ operation: 'remove_panels', panelIds: ['panel-1'] }],
    });

    expect(update).toHaveBeenCalledWith('dashboard-attachment-id', expect.anything());
    expect(sendUiEvent).toHaveBeenCalledWith(DASHBOARD_UPDATED_UI_EVENT, {
      attachment: {
        id: 'dashboard-attachment-id',
        type: DASHBOARD_ATTACHMENT_TYPE,
        data: finalDashboard,
        origin: 'saved-dashboard-id',
      },
    });
  });

  it('does not send a UI event when a new dashboard is missing its metadata', async () => {
    mockRetrieveLatestVersion.mockReturnValue(undefined);
    mockHasValidCreateMetadataOperations.mockReturnValue(false);

    const { results, sendUiEvent } = await callHandler({ operations: [] });

    expect(results[0].type).toBe(ToolResultType.error);
    expect(sendUiEvent).not.toHaveBeenCalled();
  });

  it('does not send a UI event when generating the dashboard fails', async () => {
    mockRetrieveLatestVersion.mockReturnValue(undefined);
    mockExecuteDashboardOperations.mockRejectedValue(new Error('boom'));

    const { results, sendUiEvent } = await callHandler({
      operations: [{ operation: 'set_metadata', title: 'Agent dashboard' }],
    });

    expect(results[0].type).toBe(ToolResultType.error);
    expect(sendUiEvent).not.toHaveBeenCalled();
  });
});
