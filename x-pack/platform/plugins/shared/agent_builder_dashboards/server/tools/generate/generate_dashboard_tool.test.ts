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
import {
  executeDashboardOperations,
  hasValidCreateMetadataOperations,
} from '@kbn/dashboard-agent-authoring';
import { generateDashboardTool } from './generate_dashboard_tool';

jest.mock('./attachment_state', () => ({ retrieveLatestVersion: jest.fn() }));
jest.mock('@kbn/dashboard-agent-authoring', () => ({
  ...jest.requireActual('@kbn/dashboard-agent-authoring'),
  executeDashboardOperations: jest.fn(),
  hasValidCreateMetadataOperations: jest.fn(),
}));
jest.mock('./resolvers/control_field_capabilities_resolver', () => ({
  createControlFieldCapabilitiesResolver: jest.fn(),
}));
jest.mock('./resolvers/panel_resolver', () => ({ createPanelResolver: jest.fn() }));
jest.mock('./resolvers/attachment_panel_resolver', () => ({
  createAttachmentPanelResolver: jest.fn(),
}));
jest.mock('./time_range', () => ({
  applyDefaultDashboardTimeRange: jest.fn(
    async ({ dashboardData }: { dashboardData: DashboardAttachmentData }) =>
      dashboardData.time_range
        ? dashboardData
        : { ...dashboardData, time_range: { from: 'now-7d', to: 'now' } }
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

const callHandler = async (dashboardAttachmentId?: string) => {
  const tool = generateDashboardTool({
    getValidateDashboard: jest.fn(async () => jest.fn(() => [])),
  });
  const sendUiEvent = jest.fn();
  const ctx = {
    logger: { info: jest.fn(), error: jest.fn() },
    attachments: {
      add: jest.fn(async ({ id }: { id: string }) => ({ id, current_version: 1 })),
      update: jest.fn(async (id: string) => ({ id, current_version: 2, origin: 'saved-id' })),
    },
    events: { sendUiEvent },
    esClient: { asCurrentUser: {} },
  };
  const ret = await tool.handler(
    { dashboardAttachmentId, operations: [] } as unknown as Parameters<typeof tool.handler>[0],
    ctx as unknown as Parameters<typeof tool.handler>[1]
  );
  if (!('results' in ret)) throw new Error('Unexpected HITL return from tool handler');
  return { results: ret.results, sendUiEvent, attachments: ctx.attachments };
};

describe('generateDashboardTool handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasValidCreateMetadataOperations.mockReturnValue(true);
    mockExecuteDashboardOperations.mockImplementation(async ({ finalizeDashboard }) => ({
      dashboardData: finalizeDashboard
        ? await finalizeDashboard(generatedDashboard)
        : generatedDashboard,
      failures: [],
      panelAuthoringNotes: [],
    }));
  });

  it.each([
    ['created', undefined, undefined],
    ['updated', 'dashboard-attachment-id', 'saved-id'],
  ])('sends a dashboard updated UI event with the %s attachment', async (_, id, origin) => {
    mockRetrieveLatestVersion.mockReturnValue(
      id ? ({ data: generatedDashboard } as ReturnType<typeof retrieveLatestVersion>) : undefined
    );

    const { sendUiEvent } = await callHandler(id);

    expect(sendUiEvent).toHaveBeenCalledWith(DASHBOARD_UPDATED_UI_EVENT, {
      attachment: {
        id: id ?? expect.any(String),
        type: DASHBOARD_ATTACHMENT_TYPE,
        data: { ...generatedDashboard, time_range: { from: 'now-7d', to: 'now' } },
        origin,
      },
    });
  });

  it.each([
    [
      'a new dashboard is missing its metadata',
      () => mockHasValidCreateMetadataOperations.mockReturnValue(false),
    ],
    [
      'generating the dashboard fails',
      () => mockExecuteDashboardOperations.mockRejectedValue(new Error('boom')),
    ],
  ])('does not send a UI event when %s', async (_, arrange) => {
    mockRetrieveLatestVersion.mockReturnValue(undefined);
    arrange();

    const { results, sendUiEvent } = await callHandler();

    expect(results[0].type).toBe(ToolResultType.error);
    expect(sendUiEvent).not.toHaveBeenCalled();
  });

  describe('when changes fail', () => {
    const failures = [{ type: 'validate_dashboard', identifier: 'panel', error: 'Invalid' }];
    const panel = {
      id: 'panel',
      type: 'markdown',
      config: { content: '# Title' },
      grid: { x: 0, y: 0, w: 24, h: 15 },
    };

    const mockGeneratedDashboard = (dashboardData: DashboardAttachmentData) =>
      mockExecuteDashboardOperations.mockResolvedValue({
        dashboardData,
        failures,
        panelAuthoringNotes: [],
      } as unknown as Awaited<ReturnType<typeof executeDashboardOperations>>);

    it('does not create a new dashboard without panels or controls', async () => {
      mockRetrieveLatestVersion.mockReturnValue(undefined);
      mockGeneratedDashboard(generatedDashboard);

      const { results, sendUiEvent, attachments } = await callHandler();

      expect(results).toEqual([
        {
          type: ToolResultType.error,
          data: { message: expect.any(String), metadata: { failures } },
        },
      ]);
      expect(attachments.add).not.toHaveBeenCalled();
      expect(sendUiEvent).not.toHaveBeenCalled();
    });

    it('creates a new dashboard when some panels were added', async () => {
      mockRetrieveLatestVersion.mockReturnValue(undefined);
      mockGeneratedDashboard({ ...generatedDashboard, panels: [panel] });

      const { results, sendUiEvent, attachments } = await callHandler();

      expect(results[0]).toMatchObject({ type: ToolResultType.dashboard, data: { failures } });
      expect(attachments.add).toHaveBeenCalled();
      expect(sendUiEvent).toHaveBeenCalled();
    });

    it('does not update an existing dashboard that did not change', async () => {
      const latestData: DashboardAttachmentData = { ...generatedDashboard, panels: [panel] };
      mockRetrieveLatestVersion.mockReturnValue({
        version: 3,
        data: latestData,
      } as ReturnType<typeof retrieveLatestVersion>);
      mockGeneratedDashboard(structuredClone(latestData));

      const { results, sendUiEvent, attachments } = await callHandler('dashboard-attachment-id');

      expect(results[0]).toMatchObject({
        type: ToolResultType.dashboard,
        data: { attachment_id: 'dashboard-attachment-id', version: 3, failures },
      });
      expect(attachments.update).not.toHaveBeenCalled();
      expect(sendUiEvent).not.toHaveBeenCalled();
    });

    it('updates an existing dashboard that changed', async () => {
      mockRetrieveLatestVersion.mockReturnValue({
        version: 3,
        data: generatedDashboard,
      } as ReturnType<typeof retrieveLatestVersion>);
      mockGeneratedDashboard({ ...generatedDashboard, panels: [panel] });

      const { results, attachments } = await callHandler('dashboard-attachment-id');

      expect(results[0]).toMatchObject({ data: { version: 2, failures } });
      expect(attachments.update).toHaveBeenCalled();
    });
  });
});
