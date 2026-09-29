/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { TAGS_RESPONSE_LIMIT } from '@kbn/alerting-v2-constants';
import { RuleTagsSelector } from './rule_tags_selector';

const mockRefetch = vi.fn();
const mockUseFetchRuleTags = vi.fn();
vi.mock('../../../../../hooks/use_fetch_rule_tags', () => {
      const mocked = {
      useFetchRuleTags: (...args: unknown[]) => mockUseFetchRuleTags(...args),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/react-hooks', () => {
      const mocked = {
      useDebouncedValue: (value: unknown) => value,
    };
      return { ...mocked, default: mocked };
    });

const MOCK_TAGS = ['production', 'staging', 'critical'];

const ERROR_MOCK = {
  data: [] as string[],
  isLoading: false,
  isSuccess: false,
  isError: true,
  refetch: mockRefetch,
};

const USER_EVENT_OPTIONS = {
  pointerEventsCheck: PointerEventsCheckLevel.Never,
};

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

const getComboBoxInput = () => {
  const combobox = screen.getByTestId('ruleTagsSelector');
  return within(combobox).getByRole('combobox');
};

describe('RuleTagsSelector', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup(USER_EVENT_OPTIONS);
    mockUseFetchRuleTags.mockReturnValue({
      data: MOCK_TAGS,
      isLoading: false,
      isSuccess: true,
      isError: false,
      refetch: mockRefetch,
    });
  });

  it('fetches rule tags eagerly on mount (enabled: true always)', () => {
    renderWithI18n(<RuleTagsSelector matcher={null} onChange={vi.fn()} />);

    expect(mockUseFetchRuleTags).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
  });

  it('fetches only kind: alert tags', () => {
    renderWithI18n(<RuleTagsSelector matcher={null} onChange={vi.fn()} />);

    expect(mockUseFetchRuleTags).toHaveBeenCalledWith(expect.objectContaining({ kind: 'alert' }));
  });

  it('shows API tags under Recommended group when dropdown is open', async () => {
    renderWithI18n(<RuleTagsSelector matcher={null} onChange={vi.fn()} />);

    await user.click(getComboBoxInput());

    expect(await screen.findByText('Recommended')).toBeInTheDocument();
    expect(screen.getByText('production')).toBeInTheDocument();
    expect(screen.getByText('staging')).toBeInTheDocument();
    expect(screen.getByText('critical')).toBeInTheDocument();
  });

  it('shows empty state message when no API tags and no custom tags', () => {
    mockUseFetchRuleTags.mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: true,
      isError: false,
      refetch: mockRefetch,
    });
    renderWithI18n(<RuleTagsSelector matcher={null} onChange={vi.fn()} />);

    expect(screen.getByTestId('ruleTagsSelectorEmptyState')).toBeInTheDocument();
    expect(
      screen.getByText('No rule tags in this space yet. Add a tag to scope this policy.')
    ).toBeInTheDocument();
  });

  it('does not show empty state when request failed', () => {
    mockUseFetchRuleTags.mockReturnValue(ERROR_MOCK);
    renderWithI18n(<RuleTagsSelector matcher={null} onChange={vi.fn()} />);

    expect(screen.queryByTestId('ruleTagsSelectorEmptyState')).not.toBeInTheDocument();
  });

  it('shows error message when request failed', () => {
    mockUseFetchRuleTags.mockReturnValue(ERROR_MOCK);
    renderWithI18n(<RuleTagsSelector matcher={null} onChange={vi.fn()} />);

    expect(screen.getByTestId('ruleTagsSelectorError')).toBeInTheDocument();
    expect(screen.getByText('Could not load rule tags.')).toBeInTheDocument();
  });

  it('calls refetch when retry is clicked after a failed request', async () => {
    mockUseFetchRuleTags.mockReturnValue(ERROR_MOCK);
    renderWithI18n(<RuleTagsSelector matcher={null} onChange={vi.fn()} />);

    await user.click(screen.getByTestId('ruleTagsSelectorRetry'));

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('calls onChange with the selected tag when a tag is selected', async () => {
    const onChange = vi.fn();
    renderWithI18n(<RuleTagsSelector matcher={null} onChange={onChange} />);

    await user.click(getComboBoxInput());

    await user.click(await screen.findByText('production'));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ tags: ['production'] }));
  });

  it('calls onChange with null tags when all tags are cleared', async () => {
    const onChange = vi.fn();
    renderWithI18n(<RuleTagsSelector matcher={{ tags: ['production'] }} onChange={onChange} />);

    const clearButton = screen.getByLabelText('Clear input');
    await user.click(clearButton);

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ tags: null }));
  });

  it('shows pre-existing orphaned tags from matcher as selected pills', () => {
    renderWithI18n(<RuleTagsSelector matcher={{ tags: ['legacy-tag'] }} onChange={vi.fn()} />);

    const combobox = screen.getByTestId('ruleTagsSelector');
    expect(within(combobox).getByText('legacy-tag')).toBeInTheDocument();
  });

  it('adds a newly created tag and calls onChange with it', async () => {
    const onChange = vi.fn();
    renderWithI18n(<RuleTagsSelector matcher={null} onChange={onChange} />);

    await user.type(getComboBoxInput(), 'my-new-tag');
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ tags: expect.arrayContaining(['my-new-tag']) })
    );
  });

  it('does not add a duplicate tag on onCreateOption', async () => {
    const onChange = vi.fn();
    renderWithI18n(<RuleTagsSelector matcher={{ tags: ['existing-tag'] }} onChange={onChange} />);

    await user.type(getComboBoxInput(), 'existing-tag');
    await user.keyboard('{Enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows cap guidance text when apiTags length is at limit', () => {
    const cappedTags = Array.from({ length: TAGS_RESPONSE_LIMIT }, (_, i) => `tag-${i}`);
    mockUseFetchRuleTags.mockReturnValue({
      data: cappedTags,
      isLoading: false,
      isSuccess: true,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithI18n(<RuleTagsSelector matcher={null} onChange={vi.fn()} />);

    expect(
      screen.getByText(
        `Showing first ${TAGS_RESPONSE_LIMIT} most-used tags. Type to search for more.`
      )
    ).toBeInTheDocument();
  });

  it('does not show cap guidance when apiTags length is below limit', () => {
    renderWithI18n(<RuleTagsSelector matcher={null} onChange={vi.fn()} />);

    expect(
      screen.queryByText(
        `Showing first ${TAGS_RESPONSE_LIMIT} most-used tags. Type to search for more.`
      )
    ).not.toBeInTheDocument();
  });

  it('passes search text to useFetchRuleTags when user types in the combobox', async () => {
    renderWithI18n(<RuleTagsSelector matcher={null} onChange={vi.fn()} />);

    await user.type(getComboBoxInput(), 'prod');

    expect(mockUseFetchRuleTags).toHaveBeenCalledWith(expect.objectContaining({ search: 'prod' }));
  });

  it('can discover a tag beyond the initial cap by searching', async () => {
    const cappedTags = Array.from({ length: TAGS_RESPONSE_LIMIT }, (_, i) => `tag-${i}`);
    mockUseFetchRuleTags.mockImplementation(({ search }: { search?: string }) => ({
      data: search ? ['beyond-cap-tag'] : cappedTags,
      isLoading: false,
      isSuccess: true,
      isError: false,
      refetch: mockRefetch,
    }));

    renderWithI18n(<RuleTagsSelector matcher={null} onChange={vi.fn()} />);

    await user.type(getComboBoxInput(), 'beyond');

    expect(mockUseFetchRuleTags).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'beyond' })
    );
    expect(await screen.findByText('beyond-cap-tag')).toBeInTheDocument();
  });
});
