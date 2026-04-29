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
import { RuleFilter } from './rule_filter';
import { StatusFilter } from './status_filter';
import { TagsFilter } from './tags_filter';

const mockUseFetchRules = jest.fn();
jest.mock('../../../../../hooks/use_fetch_rules', () => ({
  useFetchRules: (...args: unknown[]) => mockUseFetchRules(...args),
}));

const mockUseFetchRuleTags = jest.fn();
jest.mock('../../../../../hooks/use_fetch_rule_tags', () => ({
  useFetchRuleTags: (...args: unknown[]) => mockUseFetchRuleTags(...args),
}));

jest.mock('@kbn/react-hooks', () => ({
  useDebouncedValue: (value: string) => value,
}));

const MOCK_RULES = [
  { id: 'rule-1', kind: 'alert' as const, metadata: { name: 'CPU Alert' } },
  { id: 'rule-2', kind: 'signal' as const, metadata: { name: 'Memory Alert' } },
];

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
    mockUseFetchRules.mockReturnValue({
      data: { items: MOCK_RULES, total: 2 },
      isLoading: false,
    });
    mockUseFetchRuleTags.mockReturnValue({ data: MOCK_TAGS, isLoading: false });
  });

  it('renders all three filter buttons', () => {
    renderWithI18n(<QuickFilters matcher="" onChange={jest.fn()} />);

    expect(screen.getByTestId('quickFilterRule')).toBeInTheDocument();
    expect(screen.getByTestId('quickFilterStatus')).toBeInTheDocument();
    expect(screen.getByTestId('quickFilterTags')).toBeInTheDocument();
  });
});

describe('RuleFilter', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    jest.clearAllMocks();
    user = userEvent.setup(USER_EVENT_OPTIONS);
    mockUseFetchRules.mockReturnValue({
      data: { items: MOCK_RULES, total: 2 },
      isLoading: false,
    });
  });

  it('defers fetching until popover is first opened', () => {
    renderWithI18n(<RuleFilter matcher="" onChange={jest.fn()} />);

    expect(mockUseFetchRules).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('enables fetching when popover opens', async () => {
    renderWithI18n(<RuleFilter matcher="" onChange={jest.fn()} />);

    await user.click(screen.getByTestId('quickFilterRule'));

    expect(mockUseFetchRules).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));
  });

  it('displays rules from API', async () => {
    renderWithI18n(<RuleFilter matcher="" onChange={jest.fn()} />);

    await user.click(screen.getByTestId('quickFilterRule'));

    expect(screen.getByText('CPU Alert')).toBeInTheDocument();
    expect(screen.getByText('Memory Alert')).toBeInTheDocument();
  });

  it('shows kind badges for rules', async () => {
    renderWithI18n(<RuleFilter matcher="" onChange={jest.fn()} />);

    await user.click(screen.getByTestId('quickFilterRule'));

    expect(screen.getByText('Alerting')).toBeInTheDocument();
    expect(screen.getByText('Detect only')).toBeInTheDocument();
  });

  it('calls onChange with rule.id clause when selecting a rule', async () => {
    const onChange = jest.fn();
    renderWithI18n(<RuleFilter matcher="" onChange={onChange} />);

    await user.click(screen.getByTestId('quickFilterRule'));
    await clickOption(user, 'quickFilterRuleList', 'CPU Alert');

    expect(onChange).toHaveBeenCalledWith('rule.id : "rule-1"');
  });

  it('produces OR group when selecting multiple rules', async () => {
    const onChange = jest.fn();
    renderWithI18n(<RuleFilter matcher='rule.id : "rule-1"' onChange={onChange} />);

    await user.click(screen.getByTestId('quickFilterRule'));
    await clickOption(user, 'quickFilterRuleList', 'Memory Alert');

    expect(onChange).toHaveBeenCalledWith('(rule.id : "rule-1" OR rule.id : "rule-2")');
  });

  it('reflects existing rule.id from matcher as checked', async () => {
    renderWithI18n(<RuleFilter matcher='rule.id : "rule-1"' onChange={jest.fn()} />);

    await user.click(screen.getByTestId('quickFilterRule'));

    const list = screen.getByTestId('quickFilterRuleList');
    const options = list.querySelectorAll('li[role="option"]');
    const cpuOption = Array.from(options).find((li) => li.textContent?.includes('CPU Alert'));
    const memOption = Array.from(options).find((li) => li.textContent?.includes('Memory Alert'));

    expect(cpuOption).toHaveAttribute('aria-checked', 'true');
    expect(memOption).toHaveAttribute('aria-checked', 'false');
  });

  it('shows active filter count', () => {
    renderWithI18n(
      <RuleFilter matcher='(rule.id : "rule-1" or rule.id : "rule-2")' onChange={jest.fn()} />
    );

    const button = screen.getByTestId('quickFilterRule');
    expect(button.querySelector('.euiNotificationBadge')).toHaveTextContent('2');
  });

  it('clears rule.id from matcher when deselecting', async () => {
    const onChange = jest.fn();
    renderWithI18n(
      <RuleFilter matcher='rule.id : "rule-1" AND episode_status : "active"' onChange={onChange} />
    );

    await user.click(screen.getByTestId('quickFilterRule'));
    await clickOption(user, 'quickFilterRuleList', 'CPU Alert');

    expect(onChange).toHaveBeenCalledWith('episode_status : "active"');
  });

  it('shows synthetic entries for rule IDs in matcher but not in API results', async () => {
    renderWithI18n(<RuleFilter matcher='rule.id : "unknown-id"' onChange={jest.fn()} />);

    await user.click(screen.getByTestId('quickFilterRule'));

    expect(screen.getByText('unknown-id')).toBeInTheDocument();
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('preserves unrelated clauses when modifying rule selection', async () => {
    const onChange = jest.fn();
    renderWithI18n(
      <RuleFilter matcher='episode_status : "active" AND rule.tags : "prod"' onChange={onChange} />
    );

    await user.click(screen.getByTestId('quickFilterRule'));
    await clickOption(user, 'quickFilterRuleList', 'CPU Alert');

    expect(onChange).toHaveBeenCalledWith(
      'episode_status : "active" AND rule.tags : "prod" AND rule.id : "rule-1"'
    );
  });
});

describe('StatusFilter', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup(USER_EVENT_OPTIONS);
  });

  it('displays all four status options', async () => {
    renderWithI18n(<StatusFilter matcher="" onChange={jest.fn()} />);

    await user.click(screen.getByTestId('quickFilterStatus'));

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Recovering')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('shows descriptions for each status', async () => {
    renderWithI18n(<StatusFilter matcher="" onChange={jest.fn()} />);

    await user.click(screen.getByTestId('quickFilterStatus'));

    expect(screen.getByText('Episode is confirmed and ongoing')).toBeInTheDocument();
    expect(screen.getByText('Episode is fully resolved')).toBeInTheDocument();
  });

  it('calls onChange with episode_status clause when selecting a status', async () => {
    const onChange = jest.fn();
    renderWithI18n(<StatusFilter matcher="" onChange={onChange} />);

    await user.click(screen.getByTestId('quickFilterStatus'));
    await clickOption(user, 'quickFilterStatusList', 'Active');

    expect(onChange).toHaveBeenCalledWith('episode_status : "active"');
  });

  it('produces OR group when selecting multiple statuses', async () => {
    const onChange = jest.fn();
    renderWithI18n(<StatusFilter matcher='episode_status : "active"' onChange={onChange} />);

    await user.click(screen.getByTestId('quickFilterStatus'));
    await clickOption(user, 'quickFilterStatusList', 'Pending');

    expect(onChange).toHaveBeenCalledWith(
      '(episode_status : "active" OR episode_status : "pending")'
    );
  });

  it('reflects existing episode_status from matcher as checked', async () => {
    renderWithI18n(<StatusFilter matcher='episode_status : "active"' onChange={jest.fn()} />);

    await user.click(screen.getByTestId('quickFilterStatus'));

    const list = screen.getByTestId('quickFilterStatusList');
    const options = list.querySelectorAll('li[role="option"]');
    const activeOption = Array.from(options).find((li) => li.textContent?.includes('Active'));
    const pendingOption = Array.from(options).find((li) => li.textContent?.includes('Pending'));

    expect(activeOption).toHaveAttribute('aria-checked', 'true');
    expect(pendingOption).toHaveAttribute('aria-checked', 'false');
  });

  it('removes status clause when deselecting all', async () => {
    const onChange = jest.fn();
    renderWithI18n(
      <StatusFilter matcher='episode_status : "active" AND rule.id : "x"' onChange={onChange} />
    );

    await user.click(screen.getByTestId('quickFilterStatus'));
    await clickOption(user, 'quickFilterStatusList', 'Active');

    expect(onChange).toHaveBeenCalledWith('rule.id : "x"');
  });

  it('shows active filter count', () => {
    renderWithI18n(<StatusFilter matcher='episode_status : "active"' onChange={jest.fn()} />);

    const button = screen.getByTestId('quickFilterStatus');
    expect(button.querySelector('.euiNotificationBadge')).toHaveTextContent('1');
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
    renderWithI18n(<TagsFilter matcher="" onChange={jest.fn()} />);

    expect(mockUseFetchRuleTags).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('enables fetching when popover opens', async () => {
    renderWithI18n(<TagsFilter matcher="" onChange={jest.fn()} />);

    await user.click(screen.getByTestId('quickFilterTags'));

    expect(mockUseFetchRuleTags).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: true })
    );
  });

  it('displays tags from API', async () => {
    renderWithI18n(<TagsFilter matcher="" onChange={jest.fn()} />);

    await user.click(screen.getByTestId('quickFilterTags'));

    expect(screen.getByText('production')).toBeInTheDocument();
    expect(screen.getByText('staging')).toBeInTheDocument();
    expect(screen.getByText('critical')).toBeInTheDocument();
  });

  it('calls onChange with rule.tags clause when selecting a tag', async () => {
    const onChange = jest.fn();
    renderWithI18n(<TagsFilter matcher="" onChange={onChange} />);

    await user.click(screen.getByTestId('quickFilterTags'));
    await clickOption(user, 'quickFilterTagsList', 'production');

    expect(onChange).toHaveBeenCalledWith('rule.tags : "production"');
  });

  it('produces OR group when selecting multiple tags', async () => {
    const onChange = jest.fn();
    renderWithI18n(<TagsFilter matcher='rule.tags : "production"' onChange={onChange} />);

    await user.click(screen.getByTestId('quickFilterTags'));
    await clickOption(user, 'quickFilterTagsList', 'staging');

    expect(onChange).toHaveBeenCalledWith('(rule.tags : "production" OR rule.tags : "staging")');
  });

  it('reflects existing rule.tags from matcher as checked', async () => {
    renderWithI18n(<TagsFilter matcher='rule.tags : "production"' onChange={jest.fn()} />);

    await user.click(screen.getByTestId('quickFilterTags'));

    const list = screen.getByTestId('quickFilterTagsList');
    const options = list.querySelectorAll('li[role="option"]');
    const prodOption = Array.from(options).find((li) => li.textContent?.includes('production'));
    const stagingOption = Array.from(options).find((li) => li.textContent?.includes('staging'));

    expect(prodOption).toHaveAttribute('aria-checked', 'true');
    expect(stagingOption).toHaveAttribute('aria-checked', 'false');
  });

  it('shows orphaned tags from matcher that are not in API results', async () => {
    renderWithI18n(<TagsFilter matcher='rule.tags : "legacy-tag"' onChange={jest.fn()} />);

    await user.click(screen.getByTestId('quickFilterTags'));

    const list = screen.getByTestId('quickFilterTagsList');
    const options = list.querySelectorAll('li[role="option"]');
    const orphanedOption = Array.from(options).find((li) => li.textContent?.includes('legacy-tag'));

    expect(orphanedOption).toBeInTheDocument();
    expect(orphanedOption).toHaveAttribute('aria-checked', 'true');
  });

  it('shows active filter count', () => {
    renderWithI18n(
      <TagsFilter
        matcher='(rule.tags : "production" or rule.tags : "staging")'
        onChange={jest.fn()}
      />
    );

    const button = screen.getByTestId('quickFilterTags');
    expect(button.querySelector('.euiNotificationBadge')).toHaveTextContent('2');
  });

  it('removes tags clause when deselecting all', async () => {
    const onChange = jest.fn();
    renderWithI18n(
      <TagsFilter matcher='rule.tags : "production" AND rule.id : "x"' onChange={onChange} />
    );

    await user.click(screen.getByTestId('quickFilterTags'));
    await clickOption(user, 'quickFilterTagsList', 'production');

    expect(onChange).toHaveBeenCalledWith('rule.id : "x"');
  });
});
