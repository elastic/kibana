/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { createTextAttachmentType } from './text';

const toSurfaceText = (content: string) => {
  const composition = createTextAttachmentType().toSurfaceComposition?.(
    { content },
    { attachment: {} as VersionedAttachment, version: 1 }
  );

  return composition?.body.map(({ text }) => text);
};

describe('text attachment type', () => {
  describe('toSurfaceComposition', () => {
    it('shows the content as written, in a code block', () => {
      expect(toSurfaceText('**not bold**\n# not a heading')).toEqual([
        '```\n**not bold**\n# not a heading\n```',
      ]);
    });

    it('uses a fence longer than any backtick run in the content', () => {
      expect(toSurfaceText('before\n```\ninside\n```\nafter')).toEqual([
        '````\nbefore\n```\ninside\n```\nafter\n````',
      ]);
    });
  });
});
