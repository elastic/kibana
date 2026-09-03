/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationOriginType } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { view, text } from '@kbn/adaptive-ui/builders';
import { sampleInvestigation } from '@kbn/adaptive-ui-adapters';
import { ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE } from '../../common/constants';
import type { KibanaPublicUrlHttp } from '../kibana_public_url';
import { createSlackSurfaceProjector } from './slack_projector';

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

  it('emits no image blocks, since the Relay Slack app cannot upload them', async () => {
    const projection = await project('<render_attachment id="inv-1" />', [
      attachment('inv-1', 'nightshift.investigation', sampleInvestigation),
    ]);

    // A collected asset is a placeholder ref that needs a `files:write` upload to resolve.
    expect(JSON.stringify(projection?.blocks)).not.toContain('slack_file');
  });

  it('still projects markdown for a reply with no tags', async () => {
    const projection = await project('Just prose.');

    expect(projection?.message).toBe('Just prose.');
  });
});
