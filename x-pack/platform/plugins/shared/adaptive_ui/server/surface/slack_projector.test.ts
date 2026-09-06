/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationOriginType } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { view, text, xyChart } from '@kbn/adaptive-ui/builders';
import { sampleInvestigation } from '@kbn/adaptive-ui-adapters';
import { ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE } from '../../common/constants';
import type { KibanaPublicUrlHttp } from '../kibana_public_url';
import { createSlackSurfaceProjector } from './slack_projector';

const mockRenderNodePng = jest.fn<Promise<Buffer>, [unknown]>();

// The real renderer pulls in native `@takumi-rs/core`; the projector's contract is which
// bytes it ships, not how they were drawn.
jest.mock('../slack/render_png', () => ({
  renderNodePng: (node: unknown) => mockRenderNodePng(node),
}));

/** Placeholder refs on the `image` blocks in a projection. */
const imageRefs = (blocks: unknown[] | undefined): string[] =>
  (blocks ?? []).flatMap((block) => {
    const ref = (block as { type?: string; slack_file?: { ref?: string } })?.slack_file?.ref;
    return (block as { type?: string }).type === 'image' && ref ? [ref] : [];
  });

beforeEach(() => {
  mockRenderNodePng.mockReset();
});

const http: KibanaPublicUrlHttp = {
  basePath: {
    publicBaseUrl: 'https://kibana.example.com',
    serverBasePath: '',
    prepend: (path: string) => path,
  },
  getServerInfo: () => ({ protocol: 'https', hostname: 'localhost', port: 5601 }),
};

const attachment = (id: string, type: string, data: unknown): VersionedAttachment =>
  ({
    id,
    type,
    current_version: 1,
    versions: [
      { version: 1, data, created_at: '2026-01-01T00:00:00.000Z', content_hash: `hash-${id}` },
    ],
  } as unknown as VersionedAttachment);

const project = (message: string, attachments: VersionedAttachment[] = []) =>
  createSlackSurfaceProjector({ http }).project({
    message,
    attachments,
    spaceId: 'default',
  });

describe('createSlackSurfaceProjector', () => {
  it('registers for the Slack surface', () => {
    expect(createSlackSurfaceProjector({ http }).surface).toBe(ConversationOriginType.Slack);
  });

  it('substitutes render tags in the markdown Relay posts today', async () => {
    const projection = await project('Here it is.\n\n<render_attachment id="a1" />', [
      attachment(
        'a1',
        ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE,
        view({ body: [text({ format: 'markdown', body: 'SUMMARY' })] })
      ),
    ]);

    expect(projection?.message).not.toContain('render_attachment');
    expect(projection?.message).toContain('Here it is.');
    expect(projection?.message).toContain('SUMMARY');
  });

  it('offers Block Kit for the same reply', async () => {
    const projection = await project('Here it is.\n\n<render_attachment id="inv-1" />', [
      attachment('inv-1', 'nightshift.investigation', sampleInvestigation),
    ]);

    expect(projection?.blocks?.length).toBeGreaterThan(0);
    expect(JSON.stringify(projection?.blocks)).toContain('payment-service');
  });

  it('absolutizes links in both projections', async () => {
    const projection = await project('<render_attachment id="inv-1" />', [
      attachment('inv-1', 'nightshift.investigation', sampleInvestigation),
    ]);

    expect(projection?.message).not.toContain('](/app/');
    expect(JSON.stringify(projection?.blocks)).not.toContain('"url":"/app/');
  });

  describe('charts', () => {
    const chartView = view({
      body: [
        xyChart({
          label: 'Activity',
          series: [{ label: 'calls', values: [{ x: '16:00', y: 7 }] }],
        }),
      ],
    });

    const projectChart = () =>
      project('<render_attachment id="c1" />', [
        attachment('c1', ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE, chartView),
      ]);

    it('rasterizes charts and ships the PNGs alongside their image blocks', async () => {
      mockRenderNodePng.mockResolvedValue(Buffer.from('png-bytes'));

      const projection = await projectChart();
      const refs = imageRefs(projection?.blocks);

      // Slack has no chart block, so the image block's ref is only postable once the
      // host uploads the matching PNG.
      expect(refs).toHaveLength(1);
      expect(projection?.assets).toEqual([
        { ref: refs[0], png: Buffer.from('png-bytes'), altText: expect.any(String) },
      ]);
    });

    it('degrades charts to text when rasterizing fails', async () => {
      mockRenderNodePng.mockRejectedValue(new Error('renderer unavailable'));

      const projection = await projectChart();

      // A ref the host cannot resolve fails the whole Slack message, so the reply is
      // re-rendered without asset collection rather than shipped half-resolved.
      expect(JSON.stringify(projection?.blocks)).not.toContain('slack_file');
      expect(projection?.assets).toBeUndefined();
      // The chart survives as its text form rather than vanishing with the failed PNG.
      expect(JSON.stringify(projection?.blocks)).toContain('calls');
    });

    it('degrades charts to text when the PNGs exceed the payload budget', async () => {
      mockRenderNodePng.mockResolvedValue(Buffer.alloc(3 * 1024 * 1024));

      const projection = await projectChart();

      expect(JSON.stringify(projection?.blocks)).not.toContain('slack_file');
      expect(projection?.assets).toBeUndefined();
    });

    it('sends no assets for a reply with no chart', async () => {
      const projection = await project('<render_attachment id="inv-1" />', [
        attachment('inv-1', 'nightshift.investigation', sampleInvestigation),
      ]);

      expect(projection?.assets).toBeUndefined();
      expect(mockRenderNodePng).not.toHaveBeenCalled();
    });
  });

  it('still projects markdown for a reply with no tags', async () => {
    const projection = await project('Just prose.');

    expect(projection?.message).toBe('Just prose.');
  });
});
