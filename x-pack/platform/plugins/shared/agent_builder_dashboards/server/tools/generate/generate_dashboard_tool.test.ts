/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { DASHBOARD_UPDATED_UI_EVENT } from '../../../common';
import { retrieveLatestVersion } from './attachment_state';
import {
  executeDashboardUpsert,
  hasValidNewDashboardMetadata,
  type LayoutArrangement,
  type LayoutRequest,
} from '@kbn/dashboard-agent-authoring';
import { generateDashboardTool } from './generate_dashboard_tool';
import { createLayoutArranger } from './layout_arranger';

jest.mock('./attachment_state', () => ({ retrieveLatestVersion: jest.fn() }));
jest.mock('@kbn/dashboard-agent-authoring', () => ({
  ...jest.requireActual('@kbn/dashboard-agent-authoring'),
  executeDashboardUpsert: jest.fn(),
  hasValidNewDashboardMetadata: jest.fn(),
}));
jest.mock('./resolvers/control_field_capabilities_resolver', () => ({
  createControlFieldCapabilitiesResolver: jest.fn(),
}));
jest.mock('./layout_arranger', () => ({ createLayoutArranger: jest.fn() }));
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
const mockExecuteDashboardUpsert = executeDashboardUpsert as jest.MockedFunction<
  typeof executeDashboardUpsert
>;
const mockHasValidNewDashboardMetadata = hasValidNewDashboardMetadata as jest.MockedFunction<
  typeof hasValidNewDashboardMetadata
>;

const mockArrangeLayout = jest.fn<Promise<LayoutArrangement>, [LayoutRequest]>();
(createLayoutArranger as jest.MockedFunction<typeof createLayoutArranger>).mockReturnValue(
  mockArrangeLayout
);

/** An arrangement that keeps every panel and section where the request places it. */
const keepRequestedLayout = async ({
  panels,
  sections,
}: LayoutRequest): Promise<LayoutArrangement> => {
  const toArrangedPanels = (layoutPanels: LayoutRequest['panels']) =>
    layoutPanels.map(({ id, grid }) => ({ id, ...(grid ?? { x: 0, y: 0, w: 24, h: 10 }) }));
  return {
    plan: '',
    panels: toArrangedPanels(panels),
    sections: sections.map(({ id, y, panels: sectionPanels }) => ({
      id,
      y: y ?? 0,
      panels: toArrangedPanels(sectionPanels ?? []),
    })),
  };
};

const generatedDashboard: DashboardAttachmentData = { title: 'Agent dashboard', panels: [] };

type ToolCallSource = ToolHandlerContext['callContext']['callSource'];

interface CallHandlerOptions {
  dashboardId?: string;
  layout?: string;
  upsert?: Record<string, unknown>;
  callSource?: ToolCallSource;
  spaceId?: string;
  publicBaseUrl?: string;
  lensApiFormat?: boolean;
}

const mockDashboardClient = {
  read: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};
const mockGetDefaultModel = jest.fn();

const callHandler = async ({
  dashboardId,
  layout,
  upsert = {},
  callSource = 'agent',
  spaceId = 'default',
  publicBaseUrl,
  lensApiFormat = true,
}: CallHandlerOptions = {}) => {
  const tool = generateDashboardTool({
    getDashboardValidator: jest.fn(),
    getDashboardClient: async () =>
      mockDashboardClient as unknown as DashboardPluginStart['client'],
    isLensApiFormatEnabled: async () => lensApiFormat,
    basePath: { publicBaseUrl, serverBasePath: '/base' },
  });
  const sendUiEvent = jest.fn();
  const savedObjectsClient = {};
  const request = {};
  const ctx = {
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    attachments: {
      add: jest.fn(async ({ id }: { id: string }) => ({ id, current_version: 1 })),
      update: jest.fn(async (id: string) => ({ id, current_version: 2, origin: 'saved-id' })),
    },
    events: { sendUiEvent },
    esClient: { asCurrentUser: {} },
    callContext: { toolId: tool.id, toolCallId: 'call-1', callSource },
    savedObjectsClient,
    request,
    spaceId,
    modelProvider: { getDefaultModel: mockGetDefaultModel },
  };
  const ret = await tool.handler(
    { dashboardId, layout, ...upsert } as unknown as Parameters<typeof tool.handler>[0],
    ctx as unknown as Parameters<typeof tool.handler>[1]
  );
  if (!('results' in ret)) throw new Error('Unexpected HITL return from tool handler');
  return {
    results: ret.results,
    sendUiEvent,
    attachments: ctx.attachments,
    savedObjectsClient,
    request,
  };
};

describe('generateDashboardTool handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockArrangeLayout.mockImplementation(keepRequestedLayout);
    mockHasValidNewDashboardMetadata.mockReturnValue(true);
    mockExecuteDashboardUpsert.mockResolvedValue({
      dashboardData: generatedDashboard,
      created: [],
      updated: [],
      removed: [],
      failures: [],
      panelAuthoringNotes: [],
    });
  });

  it.each([
    ['created', undefined, undefined],
    ['updated', 'dashboard-attachment-id', 'saved-id'],
  ])('sends a dashboard updated UI event with the %s attachment', async (_, id, origin) => {
    mockRetrieveLatestVersion.mockReturnValue(
      id
        ? ({
            data: { ...generatedDashboard, description: 'Before the update' },
          } as ReturnType<typeof retrieveLatestVersion>)
        : undefined
    );

    const { sendUiEvent } = await callHandler({ dashboardId: id });

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
      () => mockHasValidNewDashboardMetadata.mockReturnValue(false),
    ],
    [
      'generating the dashboard fails',
      () => mockExecuteDashboardUpsert.mockRejectedValue(new Error('boom')),
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
      mockExecuteDashboardUpsert.mockResolvedValue({
        dashboardData,
        created: [],
        updated: [],
        removed: [],
        failures,
        panelAuthoringNotes: [],
      } as unknown as Awaited<ReturnType<typeof executeDashboardUpsert>>);

    it('does not create a new dashboard when every requested panel failed', async () => {
      mockRetrieveLatestVersion.mockReturnValue(undefined);
      mockGeneratedDashboard(generatedDashboard);

      const { results, sendUiEvent, attachments } = await callHandler({
        upsert: { panels: [{ id: 'panel' }] },
      });

      expect(results).toEqual([
        {
          type: ToolResultType.error,
          data: {
            message: expect.stringContaining('see metadata.failures'),
            metadata: { failures },
          },
        },
      ]);
      expect(attachments.add).not.toHaveBeenCalled();
      expect(sendUiEvent).not.toHaveBeenCalled();
    });

    it('does not create a new dashboard whose requested panels left only empty sections', async () => {
      mockRetrieveLatestVersion.mockReturnValue(undefined);
      mockGeneratedDashboard({
        ...generatedDashboard,
        panels: [{ id: 'section', title: 'Section', collapsed: false, grid: { y: 0 }, panels: [] }],
      });

      const { results, sendUiEvent, attachments } = await callHandler({
        upsert: {
          sections: [{ id: 'section', title: 'Section' }],
          panels: [{ id: 'panel', section: 'section' }],
        },
      });

      expect(results[0]).toEqual({
        type: ToolResultType.error,
        data: { message: expect.any(String), metadata: { failures } },
      });
      expect(attachments.add).not.toHaveBeenCalled();
      expect(sendUiEvent).not.toHaveBeenCalled();
    });

    it('does not create a new dashboard when every requested control was left out without a failure', async () => {
      mockRetrieveLatestVersion.mockReturnValue(undefined);

      const { results, sendUiEvent, attachments } = await callHandler({
        upsert: { controls: [{ id: 'control' }] },
      });

      expect(results).toEqual([
        {
          type: ToolResultType.error,
          data: {
            message: expect.stringContaining('controls you add on your own are left out'),
            metadata: { failures: [] },
          },
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

      const { results, sendUiEvent, attachments } = await callHandler({
        dashboardId: 'dashboard-attachment-id',
      });

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

      const { results, attachments } = await callHandler({
        dashboardId: 'dashboard-attachment-id',
      });

      expect(results[0]).toMatchObject({ data: { version: 2, failures } });
      expect(attachments.update).toHaveBeenCalled();
    });
  });

  describe('layout', () => {
    const panel = {
      id: 'panel',
      type: 'markdown',
      config: { content: '# Title' },
      grid: { x: 0, y: 0, w: 24, h: 15 },
    };
    const latestData: DashboardAttachmentData = { ...generatedDashboard, panels: [panel] };
    const fullWidthGrid = { x: 0, y: 0, w: 48, h: 15 };

    const mockExistingDashboard = () => {
      mockRetrieveLatestVersion.mockReturnValue({
        version: 3,
        data: latestData,
      } as ReturnType<typeof retrieveLatestVersion>);
      mockExecuteDashboardUpsert.mockResolvedValue({
        dashboardData: structuredClone(latestData),
        created: [],
        updated: [],
        removed: [],
        failures: [],
        panelAuthoringNotes: [],
      });
    };

    it('persists and sends the arranged layout of a new dashboard', async () => {
      mockRetrieveLatestVersion.mockReturnValue(undefined);
      mockExecuteDashboardUpsert.mockResolvedValue({
        dashboardData: { ...generatedDashboard, panels: [panel] },
        created: [],
        updated: [],
        removed: [],
        failures: [],
        panelAuthoringNotes: [],
      });
      mockArrangeLayout.mockResolvedValue({
        plan: '',
        panels: [{ id: 'p1', ...fullWidthGrid }],
        sections: [],
      });

      const { sendUiEvent, attachments } = await callHandler();

      const arrangedPanels = [{ ...panel, grid: fullWidthGrid }];
      expect(attachments.add).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ panels: arrangedPanels }) })
      );
      expect(sendUiEvent).toHaveBeenCalledWith(DASHBOARD_UPDATED_UI_EVENT, {
        attachment: expect.objectContaining({
          data: expect.objectContaining({ panels: arrangedPanels }),
        }),
      });
    });

    it('writes a version when a layout request changes the grid', async () => {
      mockExistingDashboard();
      mockArrangeLayout.mockResolvedValue({
        plan: '',
        panels: [{ id: 'p1', ...fullWidthGrid }],
        sections: [],
      });

      const { results, attachments } = await callHandler({
        dashboardId: 'dashboard-attachment-id',
        layout: 'make the panel full width',
      });

      expect(mockArrangeLayout).toHaveBeenCalledWith(
        expect.objectContaining({ instructions: 'make the panel full width' })
      );
      expect(attachments.update).toHaveBeenCalledWith('dashboard-attachment-id', {
        data: expect.objectContaining({ panels: [{ ...panel, grid: fullWidthGrid }] }),
        description: expect.any(String),
      });
      expect(results[0]).toMatchObject({ data: { version: 2 } });
    });

    it('returns a failure when a layout request is not applied', async () => {
      mockExistingDashboard();
      mockArrangeLayout.mockRejectedValue(new Error('Model unavailable'));

      const { results, attachments } = await callHandler({
        dashboardId: 'dashboard-attachment-id',
        layout: 'make the panel full width',
      });

      expect(attachments.update).not.toHaveBeenCalled();
      expect(results[0]).toMatchObject({
        type: ToolResultType.dashboard,
        data: {
          version: 3,
          failures: [
            expect.objectContaining({
              identifier: 'layout',
              error: expect.stringContaining('Model unavailable'),
            }),
          ],
        },
      });
    });
  });

  describe('in an Agent Builder conversation', () => {
    it('returns the attachment reference with the same result fields as before', async () => {
      mockRetrieveLatestVersion.mockReturnValue(undefined);

      const { results, attachments } = await callHandler();

      expect(attachments.add).toHaveBeenCalledWith({
        id: expect.any(String),
        type: DASHBOARD_ATTACHMENT_TYPE,
        description: 'Dashboard: Agent dashboard',
        data: { ...generatedDashboard, time_range: { from: 'now-7d', to: 'now' } },
      });
      expect(results).toEqual([
        {
          type: ToolResultType.dashboard,
          tool_result_id: expect.any(String),
          data: {
            attachment_id: attachments.add.mock.calls[0][0].id,
            version: 1,
            dashboard: {
              title: 'Agent dashboard',
              description: undefined,
              panels: [],
              controls: [],
            },
            created: [],
            updated: [],
            removed: [],
            failures: undefined,
          },
        },
      ]);
      expect(Object.keys(results[0].data)).toEqual([
        'attachment_id',
        'version',
        'dashboard',
        'created',
        'updated',
        'removed',
        'failures',
      ]);
      expect(mockDashboardClient.create).not.toHaveBeenCalled();
      expect(mockGetDefaultModel).not.toHaveBeenCalled();
    });
  });

  describe.each<ToolCallSource>(['mcp', 'user'])('outside a conversation (%s)', (callSource) => {
    const lensPanel = {
      id: 'lens-panel',
      type: LENS_EMBEDDABLE_TYPE,
      grid: { x: 0, y: 0, w: 24, h: 15 },
      config: {
        type: 'metric',
        title: 'Count',
        data_source: { type: 'esql', query: 'FROM logs | STATS count = COUNT(*)' },
        metrics: [{ type: 'primary', column: 'count' }],
        sampling: 1,
        ignore_global_filters: false,
      },
    };
    const newDashboard = {
      ...generatedDashboard,
      panels: [lensPanel],
    } as unknown as DashboardAttachmentData;
    const savedDashboardBody = (id: string, title: string) => ({
      id,
      data: { title, panels: [lensPanel] },
      meta: {},
    });

    beforeEach(() => {
      mockGetDefaultModel.mockResolvedValue({});
      mockExecuteDashboardUpsert.mockResolvedValue({
        dashboardData: newDashboard,
        created: ['lens-panel'],
        updated: [],
        removed: [],
        failures: [],
        panelAuthoringNotes: [],
      });
      mockDashboardClient.create.mockResolvedValue(savedDashboardBody('new-id', 'Agent dashboard'));
      mockDashboardClient.update.mockImplementation(async (_, id: string) =>
        savedDashboardBody(id, 'Agent dashboard')
      );
    });

    it('creates a dashboard saved object the way the Dashboard app saves it and returns an absolute url in the space', async () => {
      const { results, attachments, sendUiEvent, request } = await callHandler({
        callSource,
        spaceId: 'marketing',
        publicBaseUrl: 'https://kibana.example.com/base',
      });

      expect(mockDashboardClient.create).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          title: 'Agent dashboard',
          panels: [{ ...lensPanel, grid: expect.any(Object) }],
          time_range: { from: 'now-7d', to: 'now' },
        }),
        { isDashboardAppRequest: true }
      );
      expect(results).toEqual([
        {
          type: ToolResultType.dashboard,
          tool_result_id: expect.any(String),
          data: {
            dashboard_id: 'new-id',
            url: 'https://kibana.example.com/base/s/marketing/app/dashboards#/view/new-id',
            dashboard: expect.objectContaining({ title: 'Agent dashboard' }),
            created: ['lens-panel'],
            updated: [],
            removed: [],
            failures: undefined,
          },
        },
      ]);
      expect(mockDashboardClient.update).not.toHaveBeenCalled();
      expect(attachments.add).not.toHaveBeenCalled();
      expect(attachments.update).not.toHaveBeenCalled();
      expect(sendUiEvent).not.toHaveBeenCalled();
    });

    it('saves Lens panels as stored Lens state while the Dashboard app does not take Lens API format', async () => {
      await callHandler({ callSource, lensApiFormat: false });

      const [[, { panels }]] = mockDashboardClient.create.mock.calls;
      expect(panels).toEqual([
        {
          ...lensPanel,
          grid: expect.any(Object),
          config: expect.objectContaining({
            title: 'Count',
            attributes: expect.objectContaining({ visualizationType: 'lnsMetric' }),
          }),
        },
      ]);
      expect(panels[0].config).not.toHaveProperty('data_source');
    });

    it('returns a relative url when no public base url is configured', async () => {
      const { results } = await callHandler({ callSource });

      expect(results[0]).toMatchObject({
        data: { dashboard_id: 'new-id', url: '/base/app/dashboards#/view/new-id' },
      });
    });

    it('edits the dashboard it reads, overwriting the resolved id', async () => {
      mockDashboardClient.read.mockResolvedValue(savedDashboardBody('resolved-id', 'Before'));

      const { results, attachments, sendUiEvent, savedObjectsClient, request } = await callHandler({
        callSource,
        dashboardId: 'alias-id',
      });

      expect(mockDashboardClient.read).toHaveBeenCalledWith(savedObjectsClient, 'alias-id', {
        isDashboardAppRequest: true,
      });
      expect(mockDashboardClient.update).toHaveBeenCalledWith(
        request,
        'resolved-id',
        expect.objectContaining({
          title: 'Agent dashboard',
          panels: [{ ...lensPanel, grid: expect.any(Object) }],
        }),
        { isDashboardAppRequest: true }
      );
      expect(mockDashboardClient.create).not.toHaveBeenCalled();
      expect(results[0]).toMatchObject({
        type: ToolResultType.dashboard,
        data: { dashboard_id: 'resolved-id', url: '/base/app/dashboards#/view/resolved-id' },
      });
      expect(attachments.update).not.toHaveBeenCalled();
      expect(sendUiEvent).not.toHaveBeenCalled();
    });

    it('does not write a dashboard that did not change', async () => {
      mockDashboardClient.read.mockResolvedValue(savedDashboardBody('dash-id', 'Agent dashboard'));
      mockExecuteDashboardUpsert.mockImplementation(async ({ dashboardData }) => ({
        dashboardData: structuredClone(dashboardData)!,
        created: [],
        updated: [],
        removed: [],
        failures: [],
        panelAuthoringNotes: [],
      }));

      const { results } = await callHandler({ callSource, dashboardId: 'dash-id' });

      expect(results[0]).toMatchObject({
        type: ToolResultType.dashboard,
        data: { dashboard_id: 'dash-id', url: '/base/app/dashboards#/view/dash-id' },
      });
      expect(mockDashboardClient.update).not.toHaveBeenCalled();
      expect(mockDashboardClient.create).not.toHaveBeenCalled();
    });

    it('refuses to edit a dashboard whose read dropped content', async () => {
      mockDashboardClient.read.mockResolvedValue({
        ...savedDashboardBody('dash-id', 'Before'),
        warnings: [
          {
            type: 'dropped_panel',
            message: 'unsupported',
            panel_type: 'image',
            panel_config: {},
          },
          { type: 'dropped_property', message: 'invalid', key: 'options' },
        ],
      });

      const { results, sendUiEvent } = await callHandler({ callSource, dashboardId: 'dash-id' });

      expect(results).toEqual([
        {
          type: ToolResultType.error,
          data: {
            message: expect.stringMatching(/image[\s\S]*options[\s\S]*Nothing was changed/),
            metadata: { dashboardId: 'dash-id' },
          },
        },
      ]);
      expect(mockExecuteDashboardUpsert).not.toHaveBeenCalled();
      expect(mockDashboardClient.update).not.toHaveBeenCalled();
      expect(sendUiEvent).not.toHaveBeenCalled();
    });

    it('fails before doing any work when no AI connector is configured', async () => {
      mockGetDefaultModel.mockRejectedValue(new Error('No connector available'));

      const { results, attachments } = await callHandler({ callSource });

      expect(results).toEqual([
        {
          type: ToolResultType.error,
          data: {
            message: expect.stringMatching(
              /No AI connector is available \(No connector available\)/
            ),
            metadata: { dashboardId: undefined },
          },
        },
      ]);
      expect(mockExecuteDashboardUpsert).not.toHaveBeenCalled();
      expect(mockDashboardClient.create).not.toHaveBeenCalled();
      expect(attachments.add).not.toHaveBeenCalled();
    });
  });
});

describe('generateDashboardTool definition seen by callers without the dashboards skill', () => {
  const tool = generateDashboardTool({
    getDashboardValidator: jest.fn(),
    getDashboardClient: jest.fn(),
    isLensApiFormatEnabled: jest.fn(),
    basePath: { serverBasePath: '' },
  });

  interface DescribedNode {
    description?: string;
  }
  const { properties } = z.toJSONSchema(tool.schema, { io: 'input' }) as unknown as {
    properties: {
      panels: DescribedNode & { items: { properties: { content: DescribedNode } } };
      sections: DescribedNode;
      controls: DescribedNode;
      description: DescribedNode;
    };
  };

  it('keeps the tool description within the 1,024 characters function-calling APIs accept', () => {
    expect(tool.description.length).toBeLessThanOrEqual(1024);
    expect(tool.description).toContain('Pass that id as `dashboardId`');
  });

  it('says which panels to add and which panel kind to pick', () => {
    expect(properties.panels.description).toContain('summary metrics');
    expect(properties.panels.description).toContain('Pick the first panel kind that fits');
    expect(properties.panels.description).toContain('chartType is required for a new Lens panel');
  });

  it('says how to edit a panel and which panels cannot be edited', () => {
    const { description } = properties.panels.items.properties.content;
    expect(description).toContain('Prefer an edit to removing and re-adding the panel');
    expect(description).toContain('non-ES|QL Lens panels cannot be edited');
  });

  it('says when to use sections and how to order them', () => {
    expect(properties.sections.description).toContain('roughly 6 or more visualization panels');
    expect(properties.sections.description).toContain('summary metrics, then trends');
  });

  it('says which controls to add on a new dashboard', () => {
    expect(properties.controls.description).toContain('3-5 options_list_control dropdowns');
    expect(properties.controls.description).toContain('cannot back one');
  });

  it('asks for a description on a new dashboard', () => {
    expect(properties.description.description).toContain('Set it when creating a dashboard');
  });
});
