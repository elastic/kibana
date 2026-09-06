/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE, adaptiveUiTools } from '../../common/constants';
import type { KibanaPublicUrlHttp } from '../kibana_public_url';
import { postViewToSlackTool, type PostViewToSlackDeps } from './post_view_to_slack';

// The real renderer pulls in native `@takumi-rs/core`; these tests cover the
// orchestration around it, not the pixels.
jest.mock('../slack/render_png', () => ({
  renderNodePng: jest.fn().mockResolvedValue(Buffer.from('fake-png')),
}));

type Tool = ReturnType<typeof postViewToSlackTool>;
type Handler = Tool['handler'];

const validSpec = {
  type: 'view',
  title: 'Open cases',
  body: [{ type: 'text', body: 'Two cases need triage.' }],
};

const casesSpec = {
  type: 'view',
  title: 'Open cases',
  subtitle: '3 cases · updated 4m ago',
  body: [
    {
      type: 'entityList',
      label: 'Cases',
      items: [
        {
          title: 'Suspicious PowerShell on finance hosts',
          action: { label: 'Open case', href: '/app/security/cases/101' },
        },
      ],
    },
  ],
};

const createHttp = (publicBaseUrl = 'https://kibana.example.com'): KibanaPublicUrlHttp => ({
  basePath: {
    publicBaseUrl,
    prepend: (path) => `/xyz${path}`,
  },
  getServerInfo: () => ({ protocol: 'http', hostname: 'localhost', port: 5601 }),
});

const createDeps = (execute: jest.Mock, http: KibanaPublicUrlHttp = createHttp()) => {
  const getActionsClientWithRequest = jest.fn().mockResolvedValue({ execute });
  const getActions = jest.fn().mockResolvedValue({
    getActionsClientWithRequest,
  }) as unknown as PostViewToSlackDeps['getActions'];
  return { getActions, getActionsClientWithRequest, http };
};

const createContext = (get = jest.fn()) =>
  ({
    attachments: { get },
    logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
    request: {},
    spaceId: 'default',
  } as unknown as Parameters<Handler>[1]);

const viewSnapshot = (data: unknown, type = ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE) => ({
  id: 'att-1',
  version: 1,
  type,
  data: {
    version: 1,
    data,
    created_at: '2026-01-01T00:00:00Z',
    content_hash: 'abc',
    estimated_tokens: 10,
  },
});

const firstResult = (result: Awaited<ReturnType<Handler>>) =>
  'results' in result ? result.results[0] : undefined;

describe('postViewToSlackTool', () => {
  it('has the expected id and builtin type', () => {
    const { getActions, http } = createDeps(jest.fn());
    const tool = postViewToSlackTool({ getActions, http });
    expect(tool.id).toBe(adaptiveUiTools.postViewToSlack);
  });

  it('renders an inline spec to Block Kit and posts it via the connector', async () => {
    const execute = jest
      .fn()
      .mockResolvedValue({ status: 'ok', data: { ok: true, ts: '111.222' } });
    const { getActions, getActionsClientWithRequest, http } = createDeps(execute);
    const tool = postViewToSlackTool({ getActions, http });

    const result = await tool.handler(
      { connectorId: 'conn-1', channel: 'C123', spec: validSpec },
      createContext()
    );

    expect(getActionsClientWithRequest).toHaveBeenCalled();
    const call = execute.mock.calls[0][0];
    expect(call.actionId).toBe('conn-1');
    expect(call.params.subAction).toBe('sendMessage');
    expect(call.params.subActionParams.channel).toBe('C123');
    expect(typeof call.params.subActionParams.text).toBe('string');
    expect(Array.isArray(call.params.subActionParams.blocks)).toBe(true);
    expect(call.params.subActionParams.blocks.length).toBeGreaterThan(0);

    expect(firstResult(result)).toMatchObject({
      type: ToolResultType.other,
      data: { channel: 'C123', ts: '111.222', title: 'Open cases' },
    });
  });

  it('resolves an existing view attachment by id', async () => {
    const execute = jest
      .fn()
      .mockResolvedValue({ status: 'ok', data: { ok: true, ts: '333.444' } });
    const { getActions, http } = createDeps(execute);
    const get = jest.fn().mockReturnValue(viewSnapshot(validSpec));
    const tool = postViewToSlackTool({ getActions, http });

    await tool.handler(
      { connectorId: 'conn-1', channel: 'C123', attachmentId: 'att-1' },
      createContext(get)
    );

    expect(get).toHaveBeenCalledWith('att-1');
    expect(execute).toHaveBeenCalled();
  });

  it('threads the post when threadTs is provided', async () => {
    const execute = jest.fn().mockResolvedValue({ status: 'ok', data: { ok: true, ts: '1' } });
    const { getActions, http } = createDeps(execute);
    const tool = postViewToSlackTool({ getActions, http });

    await tool.handler(
      { connectorId: 'conn-1', channel: 'C123', spec: validSpec, threadTs: '999.000' },
      createContext()
    );

    expect(execute.mock.calls[0][0].params.subActionParams.threadTs).toBe('999.000');
  });

  it('errors when neither attachmentId nor spec is provided', async () => {
    const execute = jest.fn();
    const { getActions, http } = createDeps(execute);
    const tool = postViewToSlackTool({ getActions, http });

    const result = await tool.handler({ connectorId: 'conn-1', channel: 'C123' }, createContext());

    expect(execute).not.toHaveBeenCalled();
    expect(firstResult(result)?.type).toBe(ToolResultType.error);
  });

  it('errors when the attachment is not an Adaptive UI view', async () => {
    const execute = jest.fn();
    const { getActions, http } = createDeps(execute);
    const get = jest.fn().mockReturnValue(viewSnapshot({}, 'other.type'));
    const tool = postViewToSlackTool({ getActions, http });

    const result = await tool.handler(
      { connectorId: 'conn-1', channel: 'C123', attachmentId: 'att-1' },
      createContext(get)
    );

    expect(execute).not.toHaveBeenCalled();
    expect(firstResult(result)?.type).toBe(ToolResultType.error);
  });

  it('errors when the spec is invalid', async () => {
    const execute = jest.fn();
    const { getActions, http } = createDeps(execute);
    const tool = postViewToSlackTool({ getActions, http });

    const result = await tool.handler(
      { connectorId: 'conn-1', channel: 'C123', spec: { nonsense: true } },
      createContext()
    );

    expect(execute).not.toHaveBeenCalled();
    expect(firstResult(result)?.type).toBe(ToolResultType.error);
  });

  it('surfaces a connector execution error', async () => {
    const execute = jest.fn().mockResolvedValue({ status: 'error', message: 'channel_not_found' });
    const { getActions, http } = createDeps(execute);
    const tool = postViewToSlackTool({ getActions, http });

    const result = await tool.handler(
      { connectorId: 'conn-1', channel: 'C123', spec: validSpec },
      createContext()
    );

    expect(firstResult(result)?.type).toBe(ToolResultType.error);
  });

  describe('chart assets', () => {
    const chartSpec = {
      type: 'view',
      title: 'Risk overview',
      body: [
        {
          type: 'donut',
          label: 'Risk distribution',
          segments: [
            { label: 'Critical', value: 5, tone: 'danger' },
            { label: 'Low', value: 88, tone: 'success' },
          ],
        },
      ],
    };

    const subActionsOf = (execute: jest.Mock): string[] =>
      execute.mock.calls.map(([{ params }]) => params.subAction);

    it('uploads the rendered chart and references the returned file id', async () => {
      const execute = jest
        .fn()
        .mockResolvedValueOnce({ status: 'ok', data: { ok: true, fileId: 'F999' } })
        .mockResolvedValueOnce({ status: 'ok', data: { ok: true, ts: '1' } });
      const { getActions, http } = createDeps(execute);
      const tool = postViewToSlackTool({ getActions, http });

      await tool.handler(
        { connectorId: 'conn-1', channel: 'C123', spec: chartSpec },
        createContext()
      );

      expect(subActionsOf(execute)).toEqual(['uploadFile', 'sendMessage']);

      const upload = execute.mock.calls[0][0].params.subActionParams;
      expect(upload.filename).toBe('chart.png');
      expect(Buffer.from(upload.file, 'base64').byteLength).toBeGreaterThan(0);

      const { blocks } = execute.mock.calls[1][0].params.subActionParams;
      expect(blocks).toContainEqual(
        expect.objectContaining({ type: 'image', slack_file: { id: 'F999' } })
      );
      expect(JSON.stringify(blocks)).not.toContain('"ref"');
    });

    it('falls back to the text rendering when the upload fails', async () => {
      const execute = jest
        .fn()
        .mockResolvedValueOnce({ status: 'error', message: 'missing_scope' })
        .mockResolvedValueOnce({ status: 'ok', data: { ok: true, ts: '1' } });
      const { getActions, http } = createDeps(execute);
      const tool = postViewToSlackTool({ getActions, http });

      const result = await tool.handler(
        { connectorId: 'conn-1', channel: 'C123', spec: chartSpec },
        createContext()
      );

      expect(subActionsOf(execute)).toEqual(['uploadFile', 'sendMessage']);

      const { blocks } = execute.mock.calls[1][0].params.subActionParams;
      expect(JSON.stringify(blocks)).not.toContain('image');
      expect(JSON.stringify(blocks)).toContain('Risk distribution');
      expect(firstResult(result)?.type).toBe(ToolResultType.other);
    });

    it('does not upload anything for a spec without charts', async () => {
      const execute = jest.fn().mockResolvedValue({ status: 'ok', data: { ok: true, ts: '1' } });
      const { getActions, http } = createDeps(execute);
      const tool = postViewToSlackTool({ getActions, http });

      await tool.handler(
        { connectorId: 'conn-1', channel: 'C123', spec: validSpec },
        createContext()
      );

      expect(subActionsOf(execute)).toEqual(['sendMessage']);
    });
  });

  it('rewrites root-relative action hrefs to the public Kibana URL before posting', async () => {
    const execute = jest.fn().mockResolvedValue({ status: 'ok', data: { ok: true, ts: '1' } });
    const { getActions, http } = createDeps(execute, createHttp('https://kibana.example.com/xyz'));
    const tool = postViewToSlackTool({ getActions, http });
    const context = {
      ...createContext(),
      spaceId: 'sec',
    } as unknown as Parameters<Handler>[1];

    await tool.handler({ connectorId: 'conn-1', channel: 'C123', spec: casesSpec }, context);

    const { blocks } = execute.mock.calls[0][0].params.subActionParams;
    expect(JSON.stringify(blocks)).toContain(
      'https://kibana.example.com/xyz/s/sec/app/security/cases/101'
    );
    expect(JSON.stringify(blocks)).not.toContain('"/app/security/cases/101"');
  });
});
