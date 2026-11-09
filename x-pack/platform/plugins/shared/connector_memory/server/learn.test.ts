/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AfterToolCallHookContext } from '@kbn/agent-builder-server';
import { getConnectorSpec } from '@kbn/connector-specs';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import { LOOKUP_TOOL_ID } from '../common/constants';
import type { LearnSettings } from '../common/types';
import { createLearnHook } from './learn';

const settings = (over: Partial<LearnSettings> = {}): LearnSettings => ({
  learn: 'reads',
  reach: 'direct',
  area: { maxFiles: 50, maxDepth: 2 },
  summarizeReads: false,
  ...over,
});

const setup = (effective: LearnSettings, connectorType = '.google_drive') => {
  const runOnce = jest.fn().mockResolvedValue(undefined);
  const logger = loggingSystemMock.createLogger();
  const hook = createLearnHook({
    getConnector: async () => ({ actionTypeId: connectorType }),
    getSpaceId: () => 'default',
    isContextEngineEnabled: async () => true,
    esClient: () => ({} as never),
    settings: { effective: async () => effective } as never,
    sampleSize: 2,
    workflows: { runOnce } as never,
    logger,
  });
  const call = (over: Record<string, unknown> = {}, tools: string[] = [LOOKUP_TOOL_ID]) =>
    hook({
      toolId: 'platform.core.execute_connector_sub_action',
      toolParams: { connectorId: 'drive-1', subAction: 'downloadFile', params: { fileId: 'f1' } },
      toolReturn: { results: [{ type: 'other', data: {} }] },
      request: httpServerMock.createKibanaRequest(),
      toolHandlerContext: { agentConfiguration: { tools: [{ tool_ids: tools }] } },
      ...over,
    } as unknown as AfterToolCallHookContext);
  return { runOnce, call, logger };
};

const inputOf = (runOnce: jest.Mock) => runOnce.mock.calls[0][0].input;

describe('learn hook', () => {
  it('remembers just the file an agent read, by name unless summaries are on', async () => {
    const { runOnce, call } = setup(settings());
    await call();
    expect(inputOf(runOnce)).toEqual({
      connector_id: 'drive-1',
      files: ['f1'],
      file_mode: 'names',
      max_items: 50,
    });

    const summaries = setup(settings({ summarizeReads: true }));
    await summaries.call();
    expect(inputOf(summaries.runOnce)).toMatchObject({ file_mode: 'full' });
  });

  it('also remembers the folder around the file for neighbors, and the levels below it for an area', async () => {
    const siblings = setup(settings({ reach: 'siblings' }));
    await siblings.call();
    expect(inputOf(siblings.runOnce)).toMatchObject({ around: 0 });

    const area = setup(settings({ reach: 'area' }));
    await area.call();
    expect(inputOf(area.runOnce)).toMatchObject({ around: 2, max_items: 50 });
  });

  it('names the file by the id the connector’s download implies', async () => {
    const { runOnce, call } = setup(settings(), '.amazon_s3');
    await call({
      toolParams: {
        connectorId: 's3-1',
        subAction: 'downloadFile',
        params: { bucket: 'docs', key: 'a/b.md' },
      },
    });

    expect(inputOf(runOnce)).toMatchObject({ files: ['docs/a/b.md'] });
  });

  it('remembers by name the first files a listing showed, only beyond direct hits, and once', async () => {
    const files = ['a', 'b', 'c'].map((id) => ({ id, name: `${id}.md`, mimeType: 'text/plain' }));
    const listing = {
      toolParams: { connectorId: 'drive-1', subAction: 'listFiles', params: {} },
      toolReturn: { results: [{ type: 'other', data: { files } }] },
    };
    const direct = setup(settings());
    const siblings = setup(settings({ reach: 'siblings' }));

    await direct.call(listing);
    await siblings.call(listing);
    await siblings.call(listing);
    // A different listing straight after is left for later: one such run a minute per connector.
    await siblings.call({
      ...listing,
      toolReturn: { results: [{ type: 'other', data: { files: [{ id: 'z', name: 'z.md' }] } }] },
    });

    expect(direct.runOnce).not.toHaveBeenCalled();
    expect(siblings.runOnce).toHaveBeenCalledTimes(1);
    expect(inputOf(siblings.runOnce)).toMatchObject({
      entries: [expect.objectContaining({ id: 'a' }), expect.objectContaining({ id: 'b' })],
    });
  });

  it('says so, and remembers nothing, when the spec’s mapping fails on what a listing returned', async () => {
    const results = getConnectorSpec('.google_drive')?.contentSource?.results ?? {};
    jest.spyOn(results, 'listFiles').mockImplementation(() => {
      throw new Error('files is not iterable');
    });
    const { runOnce, call, logger } = setup(settings({ reach: 'siblings' }));

    await call({
      toolParams: { connectorId: 'drive-1', subAction: 'listFiles', params: {} },
      toolReturn: { results: [{ type: 'other', data: { files: [] } }] },
    });

    expect(runOnce).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('files is not iterable'));
    jest.restoreAllMocks();
  });

  it('does nothing for a connector set to learn nothing, a call that only listed a folder, or a call that failed', async () => {
    const off = setup(settings({ learn: 'off' }));
    await off.call();

    const listing = setup(settings());
    await listing.call({
      toolParams: { connectorId: 'drive-1', subAction: 'listFiles', params: { folderId: 'f' } },
    });

    const failed = setup(settings());
    await failed.call({ toolReturn: { results: [{ type: 'error', data: {} }] } });

    expect(
      [off.runOnce, listing.runOnce, failed.runOnce].map((runOnce) => runOnce.mock.calls.length)
    ).toEqual([0, 0, 0]);
  });

  it('does nothing for an agent that cannot use the cache, and runs once for the same file read again soon', async () => {
    const { runOnce, call } = setup(settings());

    await call({}, ['some.other.tool']);
    expect(runOnce).not.toHaveBeenCalled();

    await call();
    await call();
    expect(runOnce).toHaveBeenCalledTimes(1);
  });
});
