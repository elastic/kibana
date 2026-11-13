/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, within } from '@testing-library/react';
import React from 'react';
import type { KiListItem } from '../../../../../common/http_api/knowledge_indicators';
import { listKiTestAiIndex, renderListKiWithProviders } from './test_helpers';
import { ListKiPanel } from './list_ki_panel';

const mockUseListKi = jest.fn();
const mockUseListKiByType = jest.fn();

jest.mock('../../../hooks/use_list_ki', () => ({
  useListKi: (...args: unknown[]) => mockUseListKi(...args),
}));

jest.mock('../../../hooks/use_list_ki_by_type', () => ({
  useListKiByType: (...args: unknown[]) => mockUseListKiByType(...args),
}));

const TAB_PATH = '/ai_index/sample-ki/knowledge_documents';
const INDEX = 'ai-index-idx-sample-ki';

const ki = (id: string, type: string, extra: Partial<KiListItem> = {}): KiListItem => ({
  id,
  index: INDEX,
  type,
  title: `Title ${id}`,
  ...extra,
});

const defaultKis = [
  ki('faq-1', 'faq'),
  ki('play-1', 'playbook', { lifecycle_status: 'deleted' }),
  ki('faq-2', 'faq', { expires_at: '2000-01-01T00:00:00.000Z' }),
];

const mockList = (kis: KiListItem[] = defaultKis) =>
  mockUseListKi.mockImplementation(({ lifecycleStatus }: { lifecycleStatus: string[] }) => ({
    kis: lifecycleStatus.includes('deleted') && lifecycleStatus.length === 1 ? [kis[1]] : kis,
    total: 40,
    summary: {
      total: 40,
      countsByType: [
        { type: 'faq', count: 30 },
        { type: 'playbook', count: 1 },
      ],
    },
    isLoading: false,
    isFetching: false,
    error: undefined,
    refetch: jest.fn(),
  }));

const searchParam = (search: string, key: string) => new URLSearchParams(search).get(key);

describe('ListKiGroups', () => {
  beforeEach(() => {
    mockList();
    mockUseListKiByType.mockReturnValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('groups rows by type, biggest type first, with the type total', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);

    const headers = screen.getAllByTestId('contextListKiGroupHeader');
    expect(headers.map((header) => header.textContent)).toEqual(['faq30', 'playbook1']);
    const faqGroup = screen.getByTestId('contextListKiGroup-faq');
    expect(
      within(faqGroup)
        .getAllByTestId('contextKiRowTitle')
        .map((n) => n.textContent)
    ).toEqual(['Title faq-1', 'Title faq-2']);
  });

  it('shows status badges only for non-active rows and strikes deleted titles', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);

    const badges = screen.getAllByTestId('contextKiRowLifecycleStatus');
    expect(badges.map((badge) => badge.textContent)).toEqual(['expired', 'deleted']);
    const deletedTitle = within(screen.getByTestId('contextListKiGroup-playbook')).getByTestId(
      'contextKiRowTitle'
    );
    expect(deletedTitle).toHaveStyleRule('text-decoration', 'line-through');
  });

  it('collapses and opens a group', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    const [faqHeader] = screen.getAllByTestId('contextListKiGroupHeader');

    fireEvent.click(faqHeader);
    expect(faqHeader).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(screen.getByTestId('contextListKiGroup-faq')).queryByTestId('contextKiRow')
    ).not.toBeInTheDocument();

    fireEvent.click(faqHeader);
    expect(faqHeader).toHaveAttribute('aria-expanded', 'true');
  });

  it('loads more of one type with "Show more"', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    const faqGroup = screen.getByTestId('contextListKiGroup-faq');

    fireEvent.click(within(faqGroup).getByTestId('contextListKiShowMoreButton'));

    expect(mockUseListKiByType).toHaveBeenLastCalledWith(
      expect.objectContaining({ sizesByType: { faq: 27 } })
    );
    expect(
      within(screen.getByTestId('contextListKiGroup-playbook')).queryByTestId(
        'contextListKiShowMoreButton'
      )
    ).not.toBeInTheDocument();
  });

  it('opens the first document when none is selected, without a new history entry', () => {
    const { history } = renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);

    expect(history.action).toBe('REPLACE');
    expect(searchParam(history.location.search, 'doc')).toBe('faq-1');
    expect(history.location.pathname).toBe(`${TAB_PATH}/${INDEX}`);
    expect(screen.getAllByTestId('contextKiRow')[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('selects a row in the URL when it is clicked', () => {
    const { history } = renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);

    fireEvent.click(screen.getAllByTestId('contextKiRow')[1]);

    expect(history.action).toBe('PUSH');
    expect(history.location.pathname).toBe(`${TAB_PATH}/${INDEX}`);
    expect(searchParam(history.location.search, 'doc')).toBe('faq-2');
    expect(screen.getAllByTestId('contextKiRow')[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps a deep-linked document that is not in the list', () => {
    const { history } = renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />, {
      initialPath: `${TAB_PATH}/${INDEX}?doc=other`,
    });
    expect(searchParam(history.location.search, 'doc')).toBe('other');
  });

  it('opens the first document of the new list when a filter hides the open one', () => {
    const { history } = renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />, {
      initialPath: `${TAB_PATH}/${INDEX}?doc=faq-2`,
    });

    fireEvent.change(screen.getByTestId('contextListKiStatusFilter'), {
      target: { value: 'deleted' },
    });

    expect(history.action).toBe('REPLACE');
    expect(searchParam(history.location.search, 'doc')).toBe('play-1');
  });

  it('keeps the open document when the new filter still shows it', () => {
    const { history } = renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />, {
      initialPath: `${TAB_PATH}/${INDEX}?doc=faq-2`,
    });

    fireEvent.change(screen.getByTestId('contextListKiStatusFilter'), {
      target: { value: 'all' },
    });

    expect(searchParam(history.location.search, 'doc')).toBe('faq-2');
  });
});
