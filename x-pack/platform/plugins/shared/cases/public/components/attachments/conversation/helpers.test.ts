/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core-application-browser';
import { AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import type { AttachmentUIV2, CaseUI } from '../../../../common/ui/types';
import { basicCase } from '../../../containers/mock';
import {
  applyConversationAccess,
  getConversationAttachmentIds,
  getConversationHref,
  isConversationAttachment,
} from './helpers';

const conversationAttachment = (id: string, conversationId: string, title = 'Cached') =>
  ({
    id,
    type: AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE,
    attachmentId: conversationId,
    metadata: { title, agentId: 'agent-old' },
  } as unknown as AttachmentUIV2);

const caseWith = (comments: AttachmentUIV2[]): CaseUI => ({ ...basicCase, comments } as CaseUI);

describe('conversation attachment helpers', () => {
  const comment = basicCase.comments[0];

  it('identifies conversation attachments by type and string attachmentId', () => {
    expect(isConversationAttachment(conversationAttachment('c1', 'conv-1'))).toBe(true);
    expect(isConversationAttachment(comment)).toBe(false);
  });

  it('collects unique sorted conversation ids', () => {
    expect(
      getConversationAttachmentIds([
        conversationAttachment('c1', 'conv-b'),
        comment,
        conversationAttachment('c2', 'conv-a'),
        conversationAttachment('c3', 'conv-b'),
      ])
    ).toEqual(['conv-a', 'conv-b']);
  });

  describe('applyConversationAccess', () => {
    it('returns the same case when it has no conversation attachments', () => {
      const caseData = caseWith([comment]);
      expect(applyConversationAccess(caseData, new Map())).toBe(caseData);
    });

    it('hides every conversation attachment until the access result arrives', () => {
      const caseData = caseWith([comment, conversationAttachment('c1', 'conv-1')]);
      expect(applyConversationAccess(caseData, undefined).comments).toEqual([comment]);
    });

    it('keeps readable conversations with their live title and agent, drops the rest', () => {
      const caseData = caseWith([
        conversationAttachment('c1', 'conv-1'),
        conversationAttachment('c2', 'conv-hidden'),
        comment,
      ]);
      const accessible = new Map([
        ['conv-1', { id: 'conv-1', title: 'Renamed', agent_id: 'agent-new' }],
      ]);

      expect(applyConversationAccess(caseData, accessible).comments).toEqual([
        expect.objectContaining({
          id: 'c1',
          metadata: { title: 'Renamed', agentId: 'agent-new' },
        }),
        comment,
      ]);
    });
  });

  it('builds the full-page conversation URL', () => {
    const application = {
      getUrlForApp: jest.fn().mockReturnValue('/app/agent_builder/agents/a/conversations/c'),
    } as unknown as ApplicationStart;

    expect(getConversationHref(application, { agentId: 'a', conversationId: 'c' })).toBe(
      '/app/agent_builder/agents/a/conversations/c'
    );
    expect(application.getUrlForApp).toHaveBeenCalledWith('agent_builder', {
      path: '/agents/a/conversations/c',
    });
  });
});
