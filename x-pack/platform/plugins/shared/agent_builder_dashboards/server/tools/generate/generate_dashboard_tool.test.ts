/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { MAX_VEGA_SPEC_LENGTH } from '@kbn/agent-builder-visualizations-common';
import { generateDashboardTool } from './generate_dashboard_tool';
import { runDashboardOrchestrator } from './orchestrator';
import { applyDefaultDashboardTimeRange } from './time_range';

jest.mock('./orchestrator', () => ({
  runDashboardOrchestrator: jest.fn(),
}));

jest.mock('./time_range', () => ({
  applyDefaultDashboardTimeRange: jest.fn(),
}));

const runOrchestratorMock = runDashboardOrchestrator as jest.MockedFunction<
  typeof runDashboardOrchestrator
>;
const applyTimeRangeMock = applyDefaultDashboardTimeRange as jest.MockedFunction<
  typeof applyDefaultDashboardTimeRange
>;

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

const dashboardPayload = (title: string): DashboardAttachmentData => ({
  title,
  description: undefined,
  panels: [],
});

const attachmentRecord = (id: string, data: DashboardAttachmentData) => ({
  id,
  type: DASHBOARD_ATTACHMENT_TYPE,
  versions: [{ version: 1, data, created_at: '2026-01-01T00:00:00.000Z', content_hash: 'hash-1' }],
  current_version: 1,
});

const orchestratorResult = (dashboard: DashboardAttachmentData) => ({
  dashboard,
  failures: [],
  response: 'built the dashboard',
});

/** Narrow the handler return union to the results variant. */
const getResults = <T extends object>(handlerReturn: T) => {
  if (!('results' in handlerReturn) || !Array.isArray(handlerReturn.results)) {
    throw new Error('Expected a results return from the tool handler.');
  }
  return handlerReturn.results as Array<{ type: string; data: unknown }>;
};

describe('generateDashboardTool', () => {
  const tool = generateDashboardTool();
  let logger: Logger;
  let attachments: {
    getAttachmentRecord: jest.Mock;
    add: jest.Mock;
    update: jest.Mock;
  };
  let context: ToolHandlerContext;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = createMockLogger();
    attachments = {
      getAttachmentRecord: jest.fn(),
      add: jest.fn(async (input: { id: string }) => ({ id: input.id, current_version: 1 })),
      update: jest.fn(async (id: string) => ({ id, current_version: 2 })),
    };
    context = {
      logger,
      attachments,
      events: { emit: jest.fn() },
      esClient: { asCurrentUser: {}, asInternalUser: {} },
      modelProvider: { getDefaultModel: jest.fn(async () => ({ chatModel: {} })) },
    } as unknown as ToolHandlerContext;

    // By default the time-range end-pass tags the payload so tests can assert
    // the persisted data went through it.
    applyTimeRangeMock.mockImplementation(async ({ dashboardData }) => ({
      ...dashboardData,
      time_range: { from: 'now-24h', to: 'now' },
    }));
  });

  it('uses the camelCase input contract and rejects stale snake_case arguments', () => {
    expect(
      tool.schema.safeParse({
        dashboardAttachmentId: 'dash-1',
        request: 'rename it',
        additionalContext: 'index: sales-*',
        additionalInstructions: 'prefer dark palettes',
      }).success
    ).toBe(true);
    expect(
      tool.schema.safeParse({ dashboard_attachment_id: 'dash-1', request: 'rename it' }).success
    ).toBe(false);
    expect(
      tool.schema.safeParse({
        request: 'add this standalone Vega visualization',
        additionalContext: 'x'.repeat(MAX_VEGA_SPEC_LENGTH + 8192),
      }).success
    ).toBe(true);
    expect(
      tool.schema.safeParse({
        request: 'too much context',
        additionalContext: 'x'.repeat(MAX_VEGA_SPEC_LENGTH + 8193),
      }).success
    ).toBe(false);
  });

  it('creates a new dashboard: orchestrator gets no prior payload, attachment is added', async () => {
    const generated = dashboardPayload('Sales KPIs');
    runOrchestratorMock.mockResolvedValue(orchestratorResult(generated));

    const result = await tool.handler(
      { request: 'a sales dashboard', additionalContext: 'index: sales-*' },
      context
    );

    expect(runOrchestratorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: 'a sales dashboard',
        additionalContext: 'index: sales-*',
        dashboard: undefined,
        resolvePanelContent: expect.any(Function),
      })
    );

    // Persisted payload must be the time-range end-pass output.
    expect(attachments.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: DASHBOARD_ATTACHMENT_TYPE,
        description: 'Dashboard: Sales KPIs',
        data: expect.objectContaining({
          title: 'Sales KPIs',
          time_range: { from: 'now-24h', to: 'now' },
        }),
      })
    );
    expect(attachments.update).not.toHaveBeenCalled();

    const [toolResult] = getResults(result);
    expect(toolResult.type).toBe(ToolResultType.dashboard);
    const data = toolResult.data as Record<string, unknown>;
    expect(data.attachment_id).toBeDefined();
    expect(data.version).toBe(1);
    expect(data.response).toBe('built the dashboard');
    expect(data.failures).toBeUndefined();
    expect(data.dashboard).toEqual(
      expect.objectContaining({ title: 'Sales KPIs', panels: [], controls: [] })
    );
  });

  it('updates an existing dashboard: prior payload flows into the orchestrator', async () => {
    const existing = dashboardPayload('Existing');
    attachments.getAttachmentRecord.mockReturnValue(attachmentRecord('dash-1', existing));
    const edited = dashboardPayload('Existing (edited)');
    runOrchestratorMock.mockResolvedValue(orchestratorResult(edited));

    const result = await tool.handler(
      { dashboardAttachmentId: 'dash-1', request: 'rename it' },
      context
    );

    expect(runOrchestratorMock).toHaveBeenCalledWith(
      expect.objectContaining({ dashboard: existing })
    );
    expect(attachments.update).toHaveBeenCalledWith(
      'dash-1',
      expect.objectContaining({ description: 'Dashboard: Existing (edited)' })
    );
    expect(attachments.add).not.toHaveBeenCalled();

    const data = getResults(result)[0].data as Record<string, unknown>;
    expect(data.attachment_id).toBe('dash-1');
    expect(data.version).toBe(2);
  });

  it('passes the resolved default model and additionalInstructions to the orchestrator', async () => {
    const model = { chatModel: { marker: 'default-model' } };
    (context.modelProvider.getDefaultModel as jest.Mock).mockResolvedValue(model);
    runOrchestratorMock.mockResolvedValue(orchestratorResult(dashboardPayload('D')));

    await tool.handler({ request: 'q', additionalInstructions: 'prefer dark palettes' }, context);

    expect(context.modelProvider.getDefaultModel).toHaveBeenCalledTimes(1);
    expect(runOrchestratorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model,
        additionalInstructions: 'prefer dark palettes',
        esClient: context.esClient,
      })
    );
  });

  it('returns an error result when persisting the update yields no attachment', async () => {
    attachments.getAttachmentRecord.mockReturnValue(
      attachmentRecord('dash-1', dashboardPayload('Existing'))
    );
    attachments.update.mockResolvedValue(undefined);
    runOrchestratorMock.mockResolvedValue(orchestratorResult(dashboardPayload('Edited')));

    const result = await tool.handler({ dashboardAttachmentId: 'dash-1', request: 'q' }, context);

    const [toolResult] = getResults(result);
    expect(toolResult.type).toBe(ToolResultType.error);
    expect((toolResult.data as { message: string }).message).toContain('Failed to persist');
  });

  it('surfaces orchestrator failures in the result', async () => {
    const failures = [{ type: 'add_panels' as const, identifier: 'q', error: 'no such index' }];
    runOrchestratorMock.mockResolvedValue({
      ...orchestratorResult(dashboardPayload('D')),
      failures,
    });

    const result = await tool.handler({ request: 'q' }, context);

    const data = getResults(result)[0].data as Record<string, unknown>;
    expect(data.failures).toEqual(failures);
  });

  it('returns an error result when the referenced attachment does not exist', async () => {
    attachments.getAttachmentRecord.mockReturnValue(undefined);

    const result = await tool.handler({ dashboardAttachmentId: 'ghost', request: 'q' }, context);

    expect(runOrchestratorMock).not.toHaveBeenCalled();
    const [toolResult] = getResults(result);
    expect(toolResult.type).toBe(ToolResultType.error);
    expect((toolResult.data as { message: string }).message).toContain('"ghost" not found');
  });

  it('returns an error result when the orchestrator throws', async () => {
    runOrchestratorMock.mockRejectedValue(new Error('model exploded'));

    const result = await tool.handler({ request: 'q' }, context);

    const [toolResult] = getResults(result);
    expect(toolResult.type).toBe(ToolResultType.error);
    expect((toolResult.data as { message: string }).message).toContain('model exploded');
    expect((toolResult.data as { metadata: Record<string, unknown> }).metadata.request).toBe('q');
  });
});
