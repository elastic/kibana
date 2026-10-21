/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { createTextAttachmentType } from './text';

const toSurfaceText = async (content: string) => {
  const composition = await createTextAttachmentType().toSurfaceComposition?.(
    { id: 'text-1', type: AttachmentType.text, data: { content } },
    { request: httpServerMock.createKibanaRequest(), spaceId: 'default' }
  );

  return composition?.body.map((node) => (node.type === 'markdown' ? node.text : node.type));
};

describe('text attachment type', () => {
  describe('toSurfaceComposition', () => {
    it('shows the content as written, in a code block', async () => {
      expect(await toSurfaceText('**not bold**\n# not a heading')).toEqual([
        '```\n**not bold**\n# not a heading\n```',
      ]);
    });

    it('uses a fence longer than any backtick run in the content', async () => {
      expect(await toSurfaceText('before\n```\ninside\n```\nafter')).toEqual([
        '````\nbefore\n```\ninside\n```\nafter\n````',
      ]);
    });
  });
});
