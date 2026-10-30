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

const callHandler = async (
  dashboardId?: string,
  layout?: string,
  upsert: Record<string, unknown> = {}
) => {
  const tool = generateDashboardTool({
    getDashboardValidator: jest.fn(),
  });
  const sendUiEvent = jest.fn();
  const ctx = {
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    attachments: {
      add: jest.fn(async ({ id }: { id: string }) => ({ id, current_version: 1 })),
      update: jest.fn(async (id: string) => ({ id, current_version: 2, origin: 'saved-id' })),
    },
    events: { sendUiEvent },
    esClient: { asCurrentUser: {} },
  };
  const ret = await tool.handler(
    { dashboardId, layout, ...upsert } as unknown as Parameters<typeof tool.handler>[0],
    ctx as unknown as Parameters<typeof tool.handler>[1]
  );
  if (!('results' in ret)) throw new Error('Unexpected HITL return from tool handler');
  return { results: ret.results, sendUiEvent, attachments: ctx.attachments };
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

  it('returns each panel title in the summary', async () => {
    mockRetrieveLatestVersion.mockReturnValue(undefined);
    const grid = { x: 0, y: 0, w: 24, h: 10 };
    mockExecuteDashboardUpsert.mockResolvedValue({
      dashboardData: {
        ...generatedDashboard,
        panels: [
          { id: 'errors', type: 'vis', config: { title: 'Errors over time' }, grid },
          { id: 'note', type: 'markdown', config: { content: '# Note' }, grid },
          {
            id: 'breakdowns',
            title: 'Breakdowns',
            collapsed: false,
            grid: { y: 10 },
            panels: [{ id: 'hosts', type: 'vis', config: { title: 'Top hosts' }, grid }],
          },
        ],
      },
      created: [],
      updated: [],
      removed: [],
      failures: [],
      panelAuthoringNotes: [],
    });

    const { results } = await callHandler();

    expect(results[0]).toMatchObject({
      type: ToolResultType.dashboard,
      data: {
        dashboard: {
          panels: [
            { id: 'errors', type: 'vis', title: 'Errors over time' },
            { id: 'note', type: 'markdown', title: undefined },
            {
              id: 'breakdowns',
              title: 'Breakdowns',
              panels: [{ id: 'hosts', type: 'vis', title: 'Top hosts' }],
            },
          ],
        },
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

      const { results, sendUiEvent, attachments } = await callHandler(undefined, undefined, {
        panels: [{ id: 'panel' }],
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

      const { results, sendUiEvent, attachments } = await callHandler(undefined, undefined, {
        sections: [{ id: 'section', title: 'Section' }],
        panels: [{ id: 'panel', section: 'section' }],
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

      const { results, sendUiEvent, attachments } = await callHandler(undefined, undefined, {
        controls: [{ id: 'control' }],
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

      const { results, attachments } = await callHandler(
        'dashboard-attachment-id',
        'make the panel full width'
      );

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

      const { results, attachments } = await callHandler(
        'dashboard-attachment-id',
        'make the panel full width'
      );

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
});

describe('generateDashboardTool descriptions', () => {
  const tool = generateDashboardTool({ getDashboardValidator: jest.fn() });

  interface DescribedNode {
    description?: string;
  }
  const { properties } = z.toJSONSchema(tool.schema, { io: 'input' }) as unknown as {
    properties: {
      controls: DescribedNode;
    };
  };

  it('keeps the tool description within the 1,024 characters function-calling APIs accept', () => {
    expect(tool.description.length).toBeLessThanOrEqual(1024);
    expect(tool.description).toContain('Pass that id as `dashboardId`');
  });

  it('says that changes apply one by one and failures are listed', () => {
    expect(tool.description).toContain('Changes are applied one by one');
    expect(tool.description).toContain('resend only the failed ones');
  });

  it('says which controls are left out without a failure', () => {
    expect(properties.controls.description).toContain(
      'silently, unless `user_requested` is true or it replaces an existing control'
    );
  });
});
