/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import { validateDashboardTool, type DashboardValidationVerdict } from './validate_dashboard_tool';

const BLUE_PIXEL_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const dashboardData = {
  title: 'Web traffic',
  description: 'Traffic overview',
  panels: [
    { id: 'p1', type: 'lens', grid: { x: 0, y: 0, w: 24, h: 10 }, config: { title: 'Hits' } },
    {
      id: 's1',
      title: 'Details',
      collapsed: false,
      grid: { y: 10 },
      panels: [
        { id: 'p2', type: 'lens', grid: { x: 0, y: 0, w: 48, h: 12 }, config: { title: 'Table' } },
      ],
    },
  ],
};

const dashboardRecord = {
  id: 'dash-1',
  type: DASHBOARD_ATTACHMENT_TYPE,
  active: true,
  current_version: 1,
  versions: [{ version: 1, data: dashboardData, created_at: 'now', content_hash: 'h' }],
};

const imageRecord = {
  id: 'img-1',
  type: 'image',
  active: true,
  current_version: 1,
  versions: [
    {
      version: 1,
      data: { content: BLUE_PIXEL_PNG, mime_type: 'image/png' },
      created_at: 'now',
      content_hash: 'h',
    },
  ],
};

const passVerdict: DashboardValidationVerdict = {
  verdict: 'pass',
  summary: 'Looks good.',
  findings: [],
};

const createContext = (records: Record<string, unknown>) => {
  const invoke = jest.fn().mockResolvedValue(passVerdict);
  const withStructuredOutput = jest.fn().mockReturnValue({ invoke });
  const context = {
    logger: { info: jest.fn(), error: jest.fn(), debug: jest.fn() },
    attachments: {
      getAttachmentRecord: jest.fn((id: string) => records[id]),
    },
    modelProvider: {
      getDefaultModel: jest.fn().mockResolvedValue({ chatModel: { withStructuredOutput } }),
    },
  };
  return { context, invoke, withStructuredOutput };
};

const runTool = async (
  params: { dashboardAttachmentId: string; imageAttachmentId?: string; focus?: string },
  context: unknown
) => {
  const tool = validateDashboardTool();
  const result = await tool.handler(params, context as any);
  if (!('results' in result)) {
    throw new Error('Expected the handler to return results, got a prompt.');
  }
  return result;
};

describe('validateDashboardTool', () => {
  it('passes the screenshot as an image_url content part and returns the verdict', async () => {
    const { context, invoke, withStructuredOutput } = createContext({
      'dash-1': dashboardRecord,
      'img-1': imageRecord,
    });

    const result = await runTool(
      { dashboardAttachmentId: 'dash-1', imageAttachmentId: 'img-1' },
      context
    );

    expect(withStructuredOutput).toHaveBeenCalledWith(expect.anything(), {
      name: 'report_dashboard_validation',
    });

    const messages = invoke.mock.calls[0][0];
    const [system, user] = messages;
    expect(system[0]).toBe('system');
    expect(system[1]).toContain('screenshot');
    expect(user.role).toBe('user');
    expect(user.content).toEqual([
      { type: 'text', text: expect.stringContaining('Web traffic') },
      { type: 'image_url', image_url: { url: BLUE_PIXEL_PNG } },
    ]);
    // The panel map (coordinate system) must reference real panel ids.
    expect(user.content[0].text).toContain('p1');
    expect(user.content[0].text).toContain('p2');

    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data).toEqual(
      expect.objectContaining({ mode: 'visual', ...passVerdict })
    );
  });

  it('runs config-only when no image attachment id is given', async () => {
    const { context, invoke } = createContext({ 'dash-1': dashboardRecord });

    const result = await runTool({ dashboardAttachmentId: 'dash-1' }, context);

    const [system, user] = invoke.mock.calls[0][0];
    expect(system[1]).toContain('ONLY the dashboard configuration');
    expect(user.content).toHaveLength(1);
    expect(user.content[0].type).toBe('text');
    expect(user.content[0].text).toContain('configuration-only review');

    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data).toEqual(
      expect.objectContaining({ mode: 'config_only', verdict: 'pass' })
    );
  });

  it('includes the focus steer in the judge prompt', async () => {
    const { context, invoke } = createContext({ 'dash-1': dashboardRecord });

    await runTool({ dashboardAttachmentId: 'dash-1', focus: 'check the top row' }, context);

    const [, user] = invoke.mock.calls[0][0];
    expect(user.content[0].text).toContain('check the top row');
  });

  it('returns an error result when the dashboard attachment is missing', async () => {
    const { context, invoke } = createContext({});

    const result = await runTool({ dashboardAttachmentId: 'nope' }, context);

    expect(invoke).not.toHaveBeenCalled();
    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(result.results[0].data).toEqual(
      expect.objectContaining({ message: expect.stringContaining('not found') })
    );
  });

  it('returns an error result when the image attachment is not an image', async () => {
    const { context, invoke } = createContext({
      'dash-1': dashboardRecord,
      'img-1': { ...imageRecord, type: 'text' },
    });

    const result = await runTool(
      { dashboardAttachmentId: 'dash-1', imageAttachmentId: 'img-1' },
      context
    );

    expect(invoke).not.toHaveBeenCalled();
    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(result.results[0].data).toEqual(
      expect.objectContaining({ message: expect.stringContaining('not an image') })
    );
  });

  it('returns an error result when the judge call fails', async () => {
    const { context, invoke } = createContext({ 'dash-1': dashboardRecord });
    invoke.mockRejectedValue(new Error('model unavailable'));

    const result = await runTool({ dashboardAttachmentId: 'dash-1' }, context);

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(result.results[0].data).toEqual(
      expect.objectContaining({ message: expect.stringContaining('model unavailable') })
    );
  });
});
