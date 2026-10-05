/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { useKibana } from '../../../common/lib/kibana';
import { basicCase } from '../../../containers/mock';
import { AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import { INTERNAL_AGENT_BUILDER_CONVERSATIONS_BULK_GET_URL } from '../../../../common/constants';
import type { AttachmentUIV2, CaseUI } from '../../../../common/ui/types';
import {
  useCaseDataWithVisibleConversations,
  useVisibleConversationAttachments,
} from './use_visible_conversations';

jest.mock('../../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mock;
const mockPost = jest.fn();

const mockServices = ({ show = true }: { show?: boolean } = {}) => {
  useKibanaMock.mockReturnValue({
    services: {
      http: { post: mockPost },
      application: { capabilities: { agentBuilder: { show } } },
    },
  });
};

const conversationAttachment = (id: string, conversationId: string) =>
  ({
    id,
    type: AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE,
    attachmentId: conversationId,
    metadata: { title: 'Cached', agentId: 'agent-old' },
  } as unknown as AttachmentUIV2);

const caseData: CaseUI = {
  ...basicCase,
  comments: [
    basicCase.comments[0],
    conversationAttachment('c1', 'conv-1'),
    conversationAttachment('c2', 'conv-hidden'),
  ],
} as CaseUI;

describe('useCaseDataWithVisibleConversations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockServices();
    mockPost.mockResolvedValue({
      conversations: [
        { id: 'conv-1', title: 'Live title', agent_id: 'agent-new', access_mode: 'private' },
      ],
    });
  });

  it('hides conversations until the access result arrives, then keeps only readable ones', async () => {
    const { result } = renderHook(() => useCaseDataWithVisibleConversations(caseData), {
      wrapper: TestProviders,
    });

    expect(result.current.comments).toEqual([basicCase.comments[0]]);

    await waitFor(() => expect(result.current.comments).toHaveLength(2));
    expect(result.current.comments[1]).toEqual(
      expect.objectContaining({
        id: 'c1',
        metadata: { title: 'Live title', agentId: 'agent-new' },
      })
    );
    expect(mockPost).toHaveBeenCalledWith(INTERNAL_AGENT_BUILDER_CONVERSATIONS_BULK_GET_URL, {
      body: JSON.stringify({ ids: ['conv-1', 'conv-hidden'] }),
      signal: expect.any(AbortSignal),
    });
  });

  it('does not call the route and hides conversations without the Agent Builder privilege', async () => {
    mockServices({ show: false });

    const { result } = renderHook(() => useCaseDataWithVisibleConversations(caseData), {
      wrapper: TestProviders,
    });

    await waitFor(() => expect(result.current.comments).toEqual([basicCase.comments[0]]));
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('filters a plain attachment list the same way (activity feed)', async () => {
    const { result } = renderHook(() => useVisibleConversationAttachments(caseData.comments), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual([basicCase.comments[0]]);
    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(result.current[1]).toEqual(expect.objectContaining({ id: 'c1' }));
  });

  it('tolerates an undefined attachment list while user actions load', () => {
    const { result } = renderHook(() => useVisibleConversationAttachments(undefined), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual([]);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('returns the same case when it has no conversation attachments', () => {
    const { result } = renderHook(() => useCaseDataWithVisibleConversations(basicCase), {
      wrapper: TestProviders,
    });

    expect(result.current).toBe(basicCase);
    expect(mockPost).not.toHaveBeenCalled();
  });
});
