/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ConversationAccessControlMode } from '@kbn/agent-builder-common';
import type { ListConversationsResponseItem } from '../../../../common/http_api/conversations';
import { useConversationList } from '../../hooks/use_conversation_list';
import { ConversationSearchModal, formatConversationDate } from './conversation_search_modal';

jest.mock('../../hooks/use_conversation_list', () => ({
  useConversationList: jest.fn(),
}));

jest.mock('../../hooks/use_infinite_scroll', () => ({
  useInfiniteScroll: () => jest.fn(),
}));

jest.mock('../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    conversationTemplatesService: {
      getTemplateUIDefinition: (id: string) =>
        id === 'incident' ? { name: 'Incident' } : undefined,
    },
  }),
}));

const mockUseConversationList = jest.mocked(useConversationList);

const thisYear = moment().year();

const buildConversation = (
  overrides: Partial<ListConversationsResponseItem>
): ListConversationsResponseItem =>
  ({
    id: 'conversation',
    title: 'A chat',
    updated_at: `${thisYear}-06-03T10:00:00.000Z`,
    ...overrides,
  } as ListConversationsResponseItem);

const mockLists = ({
  cached = [],
  search = [],
  isSearching = false,
}: {
  cached?: ListConversationsResponseItem[];
  search?: ListConversationsResponseItem[];
  isSearching?: boolean;
}) => {
  mockUseConversationList.mockImplementation(({ pinned, query } = {}) => {
    if (query !== undefined) {
      return {
        conversations: search,
        isLoading: false,
        isSearching,
        hasNextPage: false,
        fetchNextPage: jest.fn(),
        isFetchingNextPage: false,
      } as unknown as ReturnType<typeof useConversationList>;
    }
    return {
      conversations: pinned ? [] : cached,
      isLoading: false,
    } as unknown as ReturnType<typeof useConversationList>;
  });
};

const renderModal = () =>
  render(
    <IntlProvider locale="en">
      <ConversationSearchModal
        agentId="agent-1"
        onClose={jest.fn()}
        onSelectConversation={jest.fn()}
      />
    </IntlProvider>
  );

describe('ConversationSearchModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('titles the list "Recent chats" when there is no query', () => {
    mockLists({ cached: [buildConversation({ id: 'c1' })] });

    renderModal();

    expect(screen.getByTestId('agentBuilderConversationSearchListHeading')).toHaveTextContent(
      'Recent chats'
    );
  });

  it('titles the list "Results" while searching', () => {
    mockLists({ search: [buildConversation({ id: 'c1' })], isSearching: true });

    renderModal();

    expect(screen.getByTestId('agentBuilderConversationSearchListHeading')).toHaveTextContent(
      'Results'
    );
  });

  it('shows the template name as the type, and "Chat" without a template', () => {
    mockLists({
      cached: [
        buildConversation({ id: 'templated', template_id: 'incident' }),
        buildConversation({ id: 'plain' }),
      ],
    });

    renderModal();

    expect(screen.getByTestId('agentBuilderConversationSearchResultType-templated')).toHaveTextContent(
      'Incident'
    );
    expect(screen.getByTestId('agentBuilderConversationSearchResultType-plain')).toHaveTextContent(
      'Chat'
    );
  });

  it('marks public chats as public and everything else as private', () => {
    mockLists({
      cached: [
        buildConversation({
          id: 'shared',
          access_control: { access_mode: ConversationAccessControlMode.Public, entries: [] },
        }),
        buildConversation({ id: 'mine' }),
      ],
    });

    renderModal();

    const shared = screen.getByTestId('agentBuilderConversationSearchResult-shared');
    const mine = screen.getByTestId('agentBuilderConversationSearchResult-mine');
    expect(shared.querySelector('[data-euiicon-type]')).toHaveAttribute(
      'data-euiicon-type',
      'lockOpen'
    );
    expect(mine.querySelector('[data-euiicon-type]')).toHaveAttribute('data-euiicon-type', 'lock');
  });

  it('shows the last updated date', () => {
    mockLists({ cached: [buildConversation({ id: 'c1' })] });

    renderModal();

    expect(screen.getByTestId('agentBuilderConversationSearchResultDate-c1')).toHaveTextContent(
      'Jun 03'
    );
  });
});

describe('ConversationSearchModal access tooltip', () => {
  it.each([
    [ConversationAccessControlMode.Public, 'Public'],
    [ConversationAccessControlMode.Private, 'Private'],
  ])('names the %s access mode in a tooltip on hover', async (accessMode, label) => {
    mockLists({
      cached: [
        buildConversation({
          id: 'c1',
          access_control: { access_mode: accessMode, entries: [] },
        }),
      ],
    });

    renderModal();

    // The mocked EuiIcon renders its aria-label as text.
    fireEvent.mouseOver(screen.getByText(label));

    expect(await screen.findByRole('tooltip')).toHaveTextContent(label);
  });
});

describe('formatConversationDate', () => {
  const now = moment('2026-11-11T12:00:00.000Z');

  it('shows month and day for dates in the current year', () => {
    expect(formatConversationDate('2026-06-03T10:00:00.000Z', now)).toBe('Jun 03');
  });

  it('adds the year for older dates', () => {
    expect(formatConversationDate('2025-06-03T10:00:00.000Z', now)).toBe('Jun 03, 2025');
  });
});
