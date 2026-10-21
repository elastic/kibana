/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { SLACK_LIMITS } from '@elastic/isomer-sdk/slack';
import type { ComponentsRenderContext } from '../../lib';
import { componentsPack } from '../../pack';
import type { ImageNode } from '.';

const { surfaces, validate } = createIsomerRuntime({ packs: [componentsPack] });

const chart: ImageNode = {
  type: 'image',
  fileId: 'file-1',
  alt: 'Checkout latency by region',
  name: 'latency & errors.png',
};

const unnamed: ImageNode = { type: 'image', fileId: 'f', alt: 'A chart' };

const view = (node: Partial<ImageNode>) =>
  validate({ type: 'view', body: [{ type: 'image', fileId: 'f', alt: 'A chart', ...node }] }).valid;

const react = (node: ImageNode, context?: ComponentsRenderContext) =>
  renderToStaticMarkup(<>{surfaces.react.renderNode(node, context ? { context } : {})}</>);

describe('image', () => {
  it('takes a file id and alt text, and an optional name', () => {
    expect(view({})).toBe(true);
    expect(view({ name: 'chart.png' })).toBe(true);
    expect(view({ fileId: '' })).toBe(false);
    expect(view({ alt: ' ' })).toBe(false);
    expect(view({ alt: 'a'.repeat(SLACK_LIMITS.imageAltTextChars + 1) })).toBe(false);
  });

  it('allocates an asset ref for Slack when the host can upload', () => {
    const { blocks, assets } = surfaces.slack.renderNode(chart, { collectAssets: true });

    expect(blocks).toEqual([
      {
        type: 'image',
        alt_text: 'Checkout latency by region',
        title: { type: 'plain_text', text: 'latency & errors.png' },
        slack_file: { ref: 'asset-0' },
      },
    ]);
    expect(assets).toEqual([
      { ref: 'asset-0', node: chart, altText: 'Checkout latency by region' },
    ]);
  });

  it('titles the Slack image with its alt text when it has no name', () => {
    const { blocks } = surfaces.slack.renderNode(unnamed, { collectAssets: true });

    expect(blocks).toEqual([
      expect.objectContaining({ title: { type: 'plain_text', text: 'A chart' } }),
    ]);
  });

  it('renders its name, escaped, in Slack when the host can’t upload', () => {
    const { blocks, assets } = surfaces.slack.renderNode(chart);

    expect(blocks).toEqual([
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: 'Image: latency &amp; errors.png' }],
      },
    ]);
    expect(assets).toEqual([]);
  });

  it('shows the file the React host resolves, through the asset policy', () => {
    const resolveFileUrl = jest.fn((fileId: string) => `/api/files/files/kind/${fileId}/blob`);
    const html = react(chart, { resolveFileUrl });

    expect(resolveFileUrl).toHaveBeenCalledWith('file-1');
    expect(html).toContain('<img src="/api/files/files/kind/file-1/blob"');
    expect(html).toContain('alt="Checkout latency by region"');
  });

  it('renders its name in React when the host resolves nothing, or something unsafe', () => {
    expect(react(chart)).toContain('Image: latency &amp; errors.png');
    expect(react(chart, { resolveFileUrl: () => undefined })).not.toContain('<img');
    expect(react(chart, { resolveFileUrl: () => 'vbscript:msgbox(1)' })).not.toContain('<img');
  });

  it('renders its name in text and Markdown', () => {
    expect(surfaces.text.renderNode(chart)).toBe('Image: latency & errors.png');
    expect(surfaces.markdown.renderNode(chart)).toContain('Image: latency & errors.png');
    expect(surfaces.text.renderNode(unnamed)).toBe('Image: A chart');
  });
});
