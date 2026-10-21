/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import type { SlackAssetRequest, SlackBlock } from '@elastic/isomer-sdk/slack';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { loadSlackAssets, replaceAssetBlocks, type SlackAssetSource } from './slack_assets';

const context = { request: httpServerMock.createKibanaRequest(), spaceId: 'space-1' };

interface SizedNode extends PrimitiveNode {
  size: number;
}

const request = (ref: string, type = 'image', size = 10): SlackAssetRequest => {
  const node: SizedNode = { type, size };
  return { ref, node, altText: ref };
};

const source = (nodeType = 'image'): SlackAssetSource => ({
  nodeType,
  load: jest.fn(async (node) => ({
    data: Buffer.alloc((node as SizedNode).size),
    mimeType: 'image/png',
    filename: `${nodeType}.png`,
  })),
});

const image = (ref: string): SlackBlock => ({
  type: 'image',
  alt_text: ref,
  slack_file: { ref },
});

const fallback = (ref: string): SlackBlock[] => [
  { type: 'context', elements: [{ type: 'mrkdwn', text: `Image: ${ref}` }] },
];

describe('loadSlackAssets', () => {
  it('loads each request through the source for its node type, in order', async () => {
    const images = source('image');
    const charts = source('chart');
    const { loaded, failed } = await loadSlackAssets({
      requests: [request('a'), request('b', 'chart'), request('c')],
      sources: [images, charts],
      context,
      logger: loggerMock.create(),
    });

    expect(loaded.map(({ ref, file }) => [ref, file.filename])).toEqual([
      ['a', 'image.png'],
      ['b', 'chart.png'],
      ['c', 'image.png'],
    ]);
    expect(failed).toEqual([]);
    expect(images.load).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ ...context, maxBytes: 2 * 1024 * 1024 })
    );
  });

  it('fails what doesn’t fit the bytes left, and still loads smaller ones after it', async () => {
    const images = source();
    const { loaded, failed } = await loadSlackAssets({
      requests: [request('a', 'image', 60), request('b', 'image', 60), request('c', 'image', 40)],
      sources: [images],
      context,
      logger: loggerMock.create(),
      maxBytes: 100,
    });

    expect(loaded.map(({ ref }) => ref)).toEqual(['a', 'c']);
    expect(failed.map(({ ref }) => ref)).toEqual(['b']);
    expect(jest.mocked(images.load).mock.calls.map(([, { maxBytes }]) => maxBytes)).toEqual([
      100, 40, 40,
    ]);
  });

  it('fails, and logs, a request without a source or whose source rejects', async () => {
    const logger = loggerMock.create();
    const failing: SlackAssetSource = {
      nodeType: 'image',
      load: async () => {
        throw new Error('file not found');
      },
    };
    const { loaded, failed } = await loadSlackAssets({
      requests: [request('a'), request('b', 'chart')],
      sources: [failing],
      context,
      logger,
    });

    expect(loaded).toEqual([]);
    expect(failed.map(({ ref }) => ref)).toEqual(['a', 'b']);
    expect(logger.warn).toHaveBeenCalledWith(
      'Showing Slack asset "a" (image) as text: file not found'
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'Showing Slack asset "b" (chart) as text: no asset source loads this node type'
    );
  });
});

describe('replaceAssetBlocks', () => {
  it('replaces failed image blocks with their fallback, and keeps the rest', () => {
    const divider: SlackBlock = { type: 'divider' };

    expect(
      replaceAssetBlocks([image('a'), divider, image('b')], new Map([['a', fallback('a')]]))
    ).toEqual([...fallback('a'), divider, image('b')]);
  });

  it('replaces failed image blocks inside containers', () => {
    const container: SlackBlock = {
      type: 'container',
      title: { type: 'plain_text', text: 'Charts' },
      child_blocks: [image('a') as never, image('b') as never],
    };

    expect(replaceAssetBlocks([container], new Map([['b', fallback('b')]]))).toEqual([
      { ...container, child_blocks: [image('a'), ...fallback('b')] },
    ]);
  });
});
