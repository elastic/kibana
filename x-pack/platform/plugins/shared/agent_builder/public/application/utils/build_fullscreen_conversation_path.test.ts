/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildFullscreenConversationPath } from './build_fullscreen_conversation_path';
import { parseScrollToAttachment } from '../context/conversation/parse_scroll_to_attachment';

const base = { conversationId: 'conv-1', agentId: 'agent-1' };
const basePath = '/agents/agent-1/conversations/conv-1';

describe('buildFullscreenConversationPath', () => {
  it('returns the conversation path alone', () => {
    expect(buildFullscreenConversationPath(base)).toBe(basePath);
  });

  it('opens the details flyout', () => {
    expect(buildFullscreenConversationPath({ ...base, openDetails: true })).toBe(
      `${basePath}?openConversationDetails=true`
    );
  });

  it('combines the details flyout with an attachment and its version', () => {
    expect(
      buildFullscreenConversationPath({
        ...base,
        openDetails: true,
        attachment: { id: 'att-1', version: 2 },
      })
    ).toBe(
      `${basePath}?openConversationDetails=true&scrollToAttachmentId=att-1&scrollToAttachmentVersion=2`
    );
  });

  it('omits the version when none is given', () => {
    expect(buildFullscreenConversationPath({ ...base, attachment: { id: 'att-1' } })).toBe(
      `${basePath}?scrollToAttachmentId=att-1`
    );
  });

  it('round-trips an attachment id that needs encoding', () => {
    const path = buildFullscreenConversationPath({
      ...base,
      attachment: { id: 'a:b c&d', version: 3 },
    });
    const search = path.slice(path.indexOf('?'));

    expect(parseScrollToAttachment(search)).toEqual({ id: 'a:b c&d', version: 3 });
  });
});
