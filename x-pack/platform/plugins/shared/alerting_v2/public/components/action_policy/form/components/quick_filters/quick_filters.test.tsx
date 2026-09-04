/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { QuickFilters } from './quick_filters';
import { TagsFilter } from './tags_filter';

const mockUseFetchRuleTags = jest.fn();
jest.mock('../../../../../hooks/use_fetch_rule_tags', () => ({
  useFetchRuleTags: (...args: unknown[]) => mockUseFetchRuleTags(...args),
}));

const MOCK_TAGS = ['production', 'staging', 'critical'];

const USER_EVENT_OPTIONS = {
  pointerEventsCheck: PointerEventsCheckLevel.Never,
  skipHover: true,
};

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

const clickOption = async (
  user: ReturnType<typeof userEvent.setup>,
  listTestSubj: string,
  optionText: string
) => {
  const list = screen.getByTestId(listTestSubj);
  const options = list.querySelectorAll('li[role="option"]');
  const target = Array.from(options).find((li) => li.textContent?.includes(optionText));
  if (!target) throw new Error(`Option containing "${optionText}" not found`);
  await user.click(target);
};

describe('QuickFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetchRuleTags.mockReturnValue({ data: MOCK_TAGS, isLoading: false });
  });

  it('renders the tags filter button', () => {
    renderWithI18n(<QuickFilters matcher={null} onChange={jest.fn()} />);

    expect(screen.getByTestId('quickFilterTags')).toBeInTheDocument();
  });
});

describe('TagsFilter', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    jest.clearAllMocks();
    user = userEvent.setup(USER_EVENT_OPTIONS);
    mockUseFetchRuleTags.mockReturnValue({ data: MOCK_TAGS, isLoading: false });
  });

  it('defers fetching until popover is first opened', () => {
    renderWithI18n(<TagsFilter matcher={null} onChange={jest.fn()} />);

    expect(mockUseFetchRuleTags).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('enables fetching when popover opens', async () => {
    renderWithI18n(<TagsFilter matcher={null} onChange={jest.fn()} />);

    await user.click(screen.getByTestId('quickFilterTags'));

    expect(mockUseFetchRuleTags).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: true })
    );
  });

  it('restricts fetched tags to kind: alert (typed, not raw KQL)', () => {
    renderWithI18n(<TagsFilter matcher={null} onChange={jest.fn()} />);

    expect(mockUseFetchRuleTags).toHaveBeenCalledWith(expect.objectContaining({ kind: 'alert' }));
    // must NOT use raw KQL filter anymore
    expect(mockUseFetchRuleTags).not.toHaveBeenCalledWith(
      expect.objectContaining({ filter: expect.anything() })
    );
  });

  it('displays tags from API', async () => {
    renderWithI18n(<TagsFilter matcher={null} onChange={jest.fn()} />);

    await user.click(screen.getByTestId('quickFilterTags'));

    expect(screen.getByText('production')).toBeInTheDocument();
    expect(screen.getByText('staging')).toBeInTheDocument();
    expect(screen.getByText('critical')).toBeInTheDocument();
  });

  it('calls onChange with tags array when selecting a tag', async () => {
    const onChange = jest.fn();
    renderWithI18n(<TagsFilter matcher={null} onChange={onChange} />);

    await user.click(screen.getByTestId('quickFilterTags'));
    await clickOption(user, 'quickFilterTagsList', 'production');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ tags: ['production'] }));
  });

  it('accumulates tags when selecting multiple', async () => {
    const onChange = jest.fn();
    renderWithI18n(<TagsFilter matcher={{ tags: ['production'] }} onChange={onChange} />);

    await user.click(screen.getByTestId('quickFilterTags'));
    await clickOption(user, 'quickFilterTagsList', 'staging');

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ tags: expect.arrayContaining(['production', 'staging']) })
    );
  });

  it('reflects existing tags from matcher as checked', async () => {
    renderWithI18n(<TagsFilter matcher={{ tags: ['production'] }} onChange={jest.fn()} />);

    await user.click(screen.getByTestId('quickFilterTags'));

    const list = screen.getByTestId('quickFilterTagsList');
    const options = list.querySelectorAll('li[role="option"]');
    const prodOption = Array.from(options).find((li) => li.textContent?.includes('production'));
    const stagingOption = Array.from(options).find((li) => li.textContent?.includes('staging'));

    expect(prodOption).toHaveAttribute('aria-checked', 'true');
    expect(stagingOption).toHaveAttribute('aria-checked', 'false');
  });

  it('shows orphaned tags from matcher that are not in API results', async () => {
    renderWithI18n(<TagsFilter matcher={{ tags: ['legacy-tag'] }} onChange={jest.fn()} />);

    await user.click(screen.getByTestId('quickFilterTags'));

    const list = screen.getByTestId('quickFilterTagsList');
    const options = list.querySelectorAll('li[role="option"]');
    const orphanedOption = Array.from(options).find((li) => li.textContent?.includes('legacy-tag'));

    expect(orphanedOption).toBeInTheDocument();
    expect(orphanedOption).toHaveAttribute('aria-checked', 'true');
  });

  it('shows active filter count', () => {
    renderWithI18n(
      <TagsFilter matcher={{ tags: ['production', 'staging'] }} onChange={jest.fn()} />
    );

    const button = screen.getByTestId('quickFilterTags');
    expect(button.querySelector('.euiNotificationBadge')).toHaveTextContent('2');
  });

  it('sets tags to null when deselecting all', async () => {
    const onChange = jest.fn();
    renderWithI18n(<TagsFilter matcher={{ tags: ['production'] }} onChange={onChange} />);

    await user.click(screen.getByTestId('quickFilterTags'));
    await clickOption(user, 'quickFilterTagsList', 'production');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ tags: null }));
  });

  it('shows cap guidance when API returns exactly 20 tags', async () => {
    const twentyTags = Array.from({ length: 20 }, (_, i) => `tag-${i}`);
    mockUseFetchRuleTags.mockReturnValue({ data: twentyTags, isLoading: false });

    renderWithI18n(<TagsFilter matcher={null} onChange={jest.fn()} />);
    await user.click(screen.getByTestId('quickFilterTags'));

    expect(screen.getByTestId('quickFilterTagsCapGuidance')).toBeInTheDocument();
  });

  it('does not show cap guidance when API returns fewer than 20 tags', async () => {
    renderWithI18n(<TagsFilter matcher={null} onChange={jest.fn()} />);
    await user.click(screen.getByTestId('quickFilterTags'));

    expect(screen.queryByTestId('quickFilterTagsCapGuidance')).not.toBeInTheDocument();
  });

  it('preserves other matcher fields during tag selection changes', async () => {
    const onChange = jest.fn();
    renderWithI18n(<TagsFilter matcher={{ tags: ['orphan'] }} onChange={onChange} />);

    await user.click(screen.getByTestId('quickFilterTags'));
    await clickOption(user, 'quickFilterTagsList', 'production');

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ tags: expect.arrayContaining(['orphan', 'production']) })
    );
  });
});
