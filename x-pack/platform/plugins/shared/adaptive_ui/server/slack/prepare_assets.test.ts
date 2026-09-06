/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlackRenderResult } from '@kbn/adaptive-ui';
import { prepareSlackAssets } from './prepare_assets';

describe('prepareSlackAssets', () => {
  it('returns blocks unchanged when there are no assets', async () => {
    const result = {
      text: 't',
      blocks: [{ type: 'section' }],
      assets: [],
    } as unknown as SlackRenderResult;
    const renderPng = jest.fn();
    const upload = jest.fn();

    const { blocks } = await prepareSlackAssets(result, { renderPng, upload });

    expect(blocks).toBe(result.blocks);
    expect(renderPng).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it('renders, uploads, and rewrites the slack_file ref to an id', async () => {
    const node = { type: 'barList', items: [] };
    const result = {
      text: 't',
      blocks: [
        { type: 'image', alt_text: 'Chart', slack_file: { ref: 'asset-0' } },
        { type: 'section' },
      ],
      assets: [{ ref: 'asset-0', node, altText: 'Chart' }],
    } as unknown as SlackRenderResult;
    const renderPng = jest.fn().mockResolvedValue(Buffer.from('png'));
    const upload = jest.fn().mockResolvedValue('F123');

    const { blocks } = await prepareSlackAssets(result, { renderPng, upload });

    expect(renderPng).toHaveBeenCalledWith(node, 'Chart');
    expect(upload).toHaveBeenCalledWith(Buffer.from('png'), 'Chart');
    expect(blocks[0]).toMatchObject({ type: 'image', slack_file: { id: 'F123' } });
    expect(blocks[1]).toMatchObject({ type: 'section' });
  });

  it('leaves a block whose ref was never resolved intact', async () => {
    const result = {
      text: 't',
      blocks: [{ type: 'image', alt_text: 'Chart', slack_file: { ref: 'asset-9' } }],
      assets: [{ ref: 'asset-0', node: { type: 'barList', items: [] }, altText: 'Chart' }],
    } as unknown as SlackRenderResult;

    const { blocks } = await prepareSlackAssets(result, {
      renderPng: jest.fn().mockResolvedValue(Buffer.from('png')),
      upload: jest.fn().mockResolvedValue('F123'),
    });

    expect(blocks[0]).toMatchObject({ slack_file: { ref: 'asset-9' } });
  });
});
