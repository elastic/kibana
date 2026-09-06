/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { loadSlackChannels, loadSlackConnectors, postViewToSlack } from './slack_client';

const { http } = coreMock.createStart();

// `http.post`'s overloads collapse to the single-argument signature on the mock,
// so the recorded `(path, options)` pair is read back through this shape.
const subActionParamsOf = (callIndex: number): Record<string, unknown> => {
  const [, options] = http.post.mock.calls[callIndex] as unknown as [string, { body: string }];
  return JSON.parse(options.body).params.subActionParams;
};

const connector = (id: string, connectorTypeId: string, isMissingSecrets = false) => ({
  id,
  name: `Connector ${id}`,
  connector_type_id: connectorTypeId,
  is_missing_secrets: isMissingSecrets,
});

describe('loadSlackConnectors', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps only Slack v2 connectors with secrets', async () => {
    http.get.mockResolvedValue([
      connector('slack-1', '.slack2'),
      connector('slack-2', '.slack2', true),
      connector('email-1', '.email'),
    ]);

    expect(await loadSlackConnectors(http)).toEqual([{ id: 'slack-1', name: 'Connector slack-1' }]);
  });
});

describe('loadSlackChannels', () => {
  beforeEach(() => jest.clearAllMocks());

  it('follows the cursor until the connector stops returning one', async () => {
    http.post
      .mockResolvedValueOnce({
        status: 'ok',
        data: { channels: [{ id: 'C1', name: 'general' }], nextCursor: 'page-2' },
      })
      .mockResolvedValueOnce({
        status: 'ok',
        data: { channels: [{ id: 'C2', name: 'alerts' }] },
      });

    const result = await loadSlackChannels(http, 'slack-1');

    expect(result).toEqual({
      channels: [
        { id: 'C1', name: 'general' },
        { id: 'C2', name: 'alerts' },
      ],
      truncated: false,
    });
    expect(subActionParamsOf(1)).toEqual({ limit: 200, cursor: 'page-2' });
  });

  it('reports truncation when the connector keeps paging', async () => {
    http.post.mockResolvedValue({
      status: 'ok',
      data: { channels: [{ id: 'C1', name: 'general' }], nextCursor: 'more' },
    });

    const result = await loadSlackChannels(http, 'slack-1');

    expect(result.truncated).toBe(true);
    expect(http.post).toHaveBeenCalledTimes(10);
  });

  it('throws the connector message when the sub-action fails', async () => {
    http.post.mockResolvedValue({ status: 'error', message: 'invalid_auth' });

    await expect(loadSlackChannels(http, 'slack-1')).rejects.toThrow('invalid_auth');
  });
});

describe('postViewToSlack', () => {
  beforeEach(() => jest.clearAllMocks());

  it('posts the spec to the share route', async () => {
    http.post.mockResolvedValue({ ts: '111.222', blocks: 3 });

    const spec = { type: 'view' as const, title: 'Open cases', body: [] };
    const result = await postViewToSlack(http, {
      connectorId: 'slack-1',
      channel: 'C1',
      spec,
    });

    expect(http.post).toHaveBeenCalledWith('/internal/adaptive_ui/share/slack', {
      body: JSON.stringify({ connectorId: 'slack-1', channel: 'C1', spec }),
    });
    expect(result).toEqual({ ts: '111.222', blocks: 3 });
  });
});
