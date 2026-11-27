/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useKibana } from '../../common/lib/kibana';
import { createStartServicesMock } from '../../common/lib/kibana/kibana_react.mock';
import { TestProviders } from '../../common/mock';
import type { InboxItem } from '../../../common/types/api/inbox/v1';
import { findInbox } from './api';
import { useInbox } from './hooks';

jest.mock('../../common/lib/kibana');
jest.mock('./api');

const useKibanaMock = useKibana as jest.Mock;
const findInboxMock = findInbox as jest.Mock;

const createItem = (id: string, createdAt: string): InboxItem => ({
  id,
  caseId: 'case-1',
  caseTitle: 'Case one',
  owner: 'securitySolution',
  commentId: id,
  content: 'hi',
  createdAt,
  createdBy: { username: 'jane', full_name: null, email: null, profile_uid: 'jane-uid' },
  reason: 'mention',
});

const OLDEST = '2026-11-01T00:00:00.000Z';
const MIDDLE = '2026-11-02T00:00:00.000Z';
const NEWEST = '2026-11-03T00:00:00.000Z';

describe('useInbox', () => {
  const getCurrent = jest.fn();
  const partialUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    const services = createStartServicesMock();
    useKibanaMock.mockReturnValue({
      services: {
        ...services,
        userProfile: { ...services.userProfile, getCurrent, partialUpdate },
      },
    });
    findInboxMock.mockResolvedValue({
      items: [createItem('c', NEWEST), createItem('b', MIDDLE), createItem('a', OLDEST)],
    });
    partialUpdate.mockResolvedValue(undefined);
  });

  const renderInbox = async () => {
    const view = renderHook(() => useInbox(), { wrapper: TestProviders });
    await waitFor(() => expect(view.result.current.items).toHaveLength(3));
    await waitFor(() => expect(getCurrent).toHaveBeenCalled());
    return view;
  };

  it('counts the items newer than the read cursor as unread', async () => {
    getCurrent.mockResolvedValue({ data: { userSettings: { casesInboxLastReadAt: MIDDLE } } });
    const { result } = await renderInbox();

    await waitFor(() => expect(result.current.unreadCount).toBe(1));
    expect(result.current.isUnread(result.current.items[0])).toBe(true);
    expect(result.current.isUnread(result.current.items[1])).toBe(false);
  });

  it('treats every item as unread without a cursor', async () => {
    getCurrent.mockResolvedValue({ data: {} });
    const { result } = await renderInbox();

    await waitFor(() => expect(result.current.unreadCount).toBe(3));
  });

  it('moves the cursor to the newest item when marking all read', async () => {
    getCurrent.mockResolvedValue({ data: { userSettings: { casesInboxLastReadAt: OLDEST } } });
    const { result } = await renderInbox();
    await waitFor(() => expect(result.current.unreadCount).toBe(2));

    act(() => result.current.markAllRead());

    await waitFor(() =>
      expect(partialUpdate).toHaveBeenCalledWith({
        userSettings: { casesInboxLastReadAt: NEWEST },
      })
    );
    await waitFor(() => expect(result.current.unreadCount).toBe(0));
  });

  it('does not save when everything is already read', async () => {
    getCurrent.mockResolvedValue({ data: { userSettings: { casesInboxLastReadAt: NEWEST } } });
    const { result } = await renderInbox();
    await waitFor(() => expect(result.current.unreadCount).toBe(0));

    act(() => result.current.markAllRead());

    expect(partialUpdate).not.toHaveBeenCalled();
  });
});
