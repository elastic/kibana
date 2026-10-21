/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImageNode, SurfaceComposition } from '@kbn/agent-builder-server/attachments';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { isomerPluginMock } from '@kbn/isomer-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { slackSurface } from './slack';
import type { SlackAssetSource } from './slack_assets';
import type { SurfaceRenderOptions } from './types';

const context = { request: httpServerMock.createKibanaRequest(), spaceId: 'space-1' };

const render = async (
  composition: SurfaceComposition,
  options: Partial<SurfaceRenderOptions> = {}
) =>
  slackSurface.render(composition, {
    runtime: await isomerPluginMock.createStartContract().getRuntime(),
    context,
    assets: false,
    assetSources: [],
    logger: loggerMock.create(),
    ...options,
  });

const imageSource = (load: SlackAssetSource['load']): SlackAssetSource => ({
  nodeType: 'image',
  load: jest.fn(load),
});

const png = (bytes: number) => ({
  data: Buffer.alloc(bytes, 1),
  mimeType: 'image/png',
  filename: 'chart.png',
});

const withImage: SurfaceComposition = {
  type: 'view',
  body: [
    { type: 'markdown', text: 'Here is the chart:' },
    { type: 'image', fileId: 'file-1', alt: 'Checkout latency', name: 'chart.png' },
  ],
};

const nameBlock = {
  type: 'context',
  elements: [{ type: 'mrkdwn', text: 'Image: chart.png' }],
};

describe('slackSurface', () => {
  it('renders the composition as Block Kit', async () => {
    const composition: SurfaceComposition = {
      type: 'view',
      body: [{ type: 'markdown', text: 'There are **3** [alerts](https://example.com).' }],
    };

    expect(await render(composition)).toEqual({
      text: expect.any(String),
      blocks: [
        {
          type: 'rich_text',
          elements: [
            {
              type: 'rich_text_section',
              elements: [
                { type: 'text', text: 'There are ' },
                { type: 'text', text: '3', style: { bold: true } },
                { type: 'text', text: ' ' },
                { type: 'link', text: 'alerts', url: 'https://example.com' },
                { type: 'text', text: '.' },
              ],
            },
          ],
        },
      ],
    });
  });

  it('renders images as their name when the poster does not upload assets', async () => {
    const source = imageSource(async () => png(10));
    const payload = await render(withImage, { assetSources: [source] });

    expect(payload.blocks).toContainEqual(nameBlock);
    expect(payload.blocks).not.toContainEqual(expect.objectContaining({ type: 'image' }));
    expect(payload).not.toHaveProperty('assets');
    expect(source.load).not.toHaveBeenCalled();
  });

  it('ships each image’s file for the poster to upload, with its fallback', async () => {
    const source = imageSource(async () => png(3));
    const payload = await render(withImage, { assets: true, assetSources: [source] });

    expect(source.load).toHaveBeenCalledWith(
      expect.objectContaining({ fileId: 'file-1' }),
      expect.objectContaining({ ...context, maxBytes: 2 * 1024 * 1024 })
    );
    expect(payload.blocks).toContainEqual({
      type: 'image',
      alt_text: 'Checkout latency',
      title: { type: 'plain_text', text: 'chart.png' },
      slack_file: { ref: 'kibana-0' },
    });
    expect(payload.assets).toEqual([
      {
        ref: 'kibana-0',
        data: Buffer.alloc(3, 1).toString('base64'),
        mime_type: 'image/png',
        filename: 'chart.png',
        alt_text: 'Checkout latency',
        fallback_blocks: [nameBlock],
      },
    ]);
  });

  it('renders an image as its name when its file can’t be loaded, and still posts', async () => {
    const logger = loggerMock.create();
    const source = imageSource(async () => {
      throw new Error('file not found');
    });
    const payload = await render(withImage, { assets: true, assetSources: [source], logger });

    expect(payload.blocks).toContainEqual(nameBlock);
    expect(payload.blocks).not.toContainEqual(expect.objectContaining({ type: 'image' }));
    expect(payload).not.toHaveProperty('assets');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('file not found'));
  });

  it('keeps every image block matched to an asset', async () => {
    const composition: SurfaceComposition = {
      type: 'view',
      body: [
        { type: 'image', fileId: 'big', alt: 'Too big', name: 'big.png' },
        { type: 'image', fileId: 'small', alt: 'Fits', name: 'small.png' },
      ],
    };
    const source = imageSource(async (node) =>
      png((node as ImageNode).fileId === 'big' ? 3 * 1024 * 1024 : 10)
    );
    const { blocks, assets = [] } = await render(composition, {
      assets: true,
      assetSources: [source],
    });

    const refs = blocks.flatMap((block) =>
      block.type === 'image' && block.slack_file?.ref ? [block.slack_file.ref] : []
    );

    expect(refs).toEqual(['kibana-1']);
    expect(assets.map(({ ref }) => ref)).toEqual(refs);
    expect(blocks).toContainEqual({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: 'Image: big.png' }],
    });
  });

  it("resolves Kibana app links against the space's base URL", async () => {
    const composition: SurfaceComposition = {
      type: 'view',
      body: [
        {
          type: 'link',
          label: 'Edit in Management',
          app: 'agent_builder',
          path: '/manage/skills/s1',
        },
      ],
    };

    expect(
      JSON.stringify(
        await render(composition, { baseUrl: 'https://kibana.example.com/base/s/ops' })
      )
    ).toContain('https://kibana.example.com/base/s/ops/app/agent_builder/manage/skills/s1');
    expect(JSON.stringify(await render(composition))).not.toContain('Edit in Management');
  });
});
