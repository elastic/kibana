/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, within } from '@testing-library/react';
import React from 'react';
import type { KiGroup, KiListItem } from '../../../../../common/http_api/knowledge_indicators';
import { listKiTestAiIndex, renderListKiWithProviders } from './test_helpers';
import { ListKiPanel } from './list_ki_panel';

const mockUseListKi = jest.fn();
const mockUseListKiByType = jest.fn();
const mockUseListKiGroups = jest.fn();

jest.mock('../../../hooks/use_list_ki', () => ({
  useListKi: (...args: unknown[]) => mockUseListKi(...args),
}));

jest.mock('../../../hooks/use_list_ki_by_type', () => ({
  useListKiByType: (...args: unknown[]) => mockUseListKiByType(...args),
}));

jest.mock('../../../hooks/use_list_ki_groups', () => ({
  useListKiGroups: (...args: unknown[]) => mockUseListKiGroups(...args),
}));

const TAB_PATH = '/ai_index/sample-ki/knowledge_documents';
const INDEX = 'ai-index-idx-sample-ki';

const ki = (id: string, type: string | undefined, extra: Partial<KiListItem> = {}): KiListItem => ({
  id,
  index: INDEX,
  ...(type !== undefined ? { type } : {}),
  title: `Title ${id}`,
  status: 'active',
  ...extra,
});

const FAQ: KiGroup = {
  type: 'faq',
  count: 30,
  kis: [ki('faq-1', 'faq'), ki('faq-2', 'faq', { status: 'expired' })],
};
const PLAYBOOK: KiGroup = {
  type: 'playbook',
  count: 1,
  kis: [ki('play-1', 'playbook', { status: 'deleted' })],
};

const groupsResult = (groups: KiGroup[], totalOther: number) => ({
  groups,
  total: groups.reduce((sum, { count }) => sum + count, 0) + totalOther,
  totalOther,
  isLoading: false,
  isFetching: false,
  isPreviousData: false,
  error: undefined,
});

/** `otherGroups`: the biggest types inside "Other" (the `_groups` call with `excludeTypes`). */
const mockGroups = ({
  totalOther = 0,
  otherGroups = [],
}: { totalOther?: number; otherGroups?: KiGroup[] } = {}) =>
  mockUseListKiGroups.mockImplementation(
    ({ status, excludeTypes }: { status: string[]; excludeTypes?: readonly string[] }) => {
      if (excludeTypes !== undefined) {
        const inGroups = otherGroups.reduce((sum, { count }) => sum + count, 0);
        return groupsResult(otherGroups, totalOther - inGroups);
      }
      const onlyDeleted = status.length === 1 && status[0] === 'deleted';
      return groupsResult(onlyDeleted ? [PLAYBOOK] : [FAQ, PLAYBOOK], totalOther);
    }
  );

const mockOther = (kis: KiListItem[] = [], total = kis.length) =>
  mockUseListKi.mockImplementation(({ enabled }: { enabled: boolean }) => ({
    kis: enabled ? kis : [],
    total: enabled ? total : 0,
    summary: { total: 0, countsByType: [] },
    isLoading: false,
    isFetching: false,
    isPreviousData: false,
    error: undefined,
    refetch: jest.fn(),
  }));

const searchParam = (search: string, key: string) => new URLSearchParams(search).get(key);

describe('ListKiGroups', () => {
  beforeEach(() => {
    mockGroups();
    mockOther();
    mockUseListKiByType.mockReturnValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows the groups biggest first, with the group total and its first rows', () => {
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
      expect.objectContaining({ sizesByType: { faq: 52 } })
    );
    expect(
      within(screen.getByTestId('contextListKiGroup-playbook')).queryByTestId(
        'contextListKiShowMoreButton'
      )
    ).not.toBeInTheDocument();
  });

  it('shows header, tiles and only the selected sections, with "Other" split by type', () => {
    mockGroups({
      totalOther: 3,
      otherGroups: [{ type: 'zeta', count: 1, kis: [ki('o-1', 'zeta')] }],
    });
    // The rest of "Other": types past its groups and documents without a type.
    mockOther([ki('o-2', undefined), ki('o-3', 'eta')]);
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);

    expect(screen.getByTestId('contextListKiHeaderCount')).toHaveTextContent(
      '34 Knowledge documents'
    );
    expect(screen.queryByTestId('contextListKiGroupOther')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('contextListKiTileOther'));
    expect(screen.getByTestId('contextListKiTileOther')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('contextListKiGroup-faq')).not.toBeInTheDocument();
    expect(
      screen.getAllByTestId('contextListKiGroupHeader').map((header) => header.textContent)
    ).toEqual(['zeta1', 'Other2']);
    expect(
      within(screen.getByTestId('contextListKiGroup-zeta')).getAllByTestId('contextKiRow')
    ).toHaveLength(1);
    expect(
      within(screen.getByTestId('contextListKiGroupOther')).getAllByTestId('contextKiRow')
    ).toHaveLength(2);

    fireEvent.click(screen.getByTestId('contextListKiTile-faq'));
    expect(
      screen.getAllByTestId('contextListKiGroupHeader').map((header) => header.textContent)
    ).toEqual(['faq30', 'zeta1', 'Other2']);

    // A second click deselects; with nothing selected every group is back, "Other" hides.
    fireEvent.click(screen.getByTestId('contextListKiTile-faq'));
    fireEvent.click(screen.getByTestId('contextListKiTileOther'));
    expect(screen.getAllByTestId('contextListKiGroupHeader')).toHaveLength(2);
    expect(screen.queryByTestId('contextListKiGroupOther')).not.toBeInTheDocument();
  });

  it('opens the first document when none is selected, without a new history entry', () => {
    const { history } = renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);

    expect(history.action).toBe('REPLACE');
    expect(searchParam(history.location.search, 'doc')).toBe('faq-1');
    expect(history.location.pathname).toBe(`${TAB_PATH}/${INDEX}`);
    expect(screen.getAllByTestId('contextKiRow')[0]).toHaveAttribute('aria-current', 'true');
  });

  it('selects a row in the URL when it is clicked', () => {
    const { history } = renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);

    fireEvent.click(screen.getAllByTestId('contextKiRow')[1]);

    expect(history.action).toBe('PUSH');
    expect(history.location.pathname).toBe(`${TAB_PATH}/${INDEX}`);
    expect(searchParam(history.location.search, 'doc')).toBe('faq-2');
    expect(screen.getAllByTestId('contextKiRow')[1]).toHaveAttribute('aria-current', 'true');
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
