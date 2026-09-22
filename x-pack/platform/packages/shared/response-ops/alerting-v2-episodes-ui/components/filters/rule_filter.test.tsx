/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AlertEpisodesRuleFilter } from './rule_filter';
import { fetchRulesSearch } from '../../apis/fetch_rules_search';
import * as inlineFilterPopoverModule from './inline_filter_popover';
import userEvent from '@testing-library/user-event';

jest.mock('../../apis/fetch_rules_search');

const mockFetchRulesSearch = jest.mocked(fetchRulesSearch);
const InlineFilterPopoverSpy = jest.spyOn(inlineFilterPopoverModule, 'InlineFilterPopover');

describe('RuleFilter', () => {
  const mockHttp = {} as any;
  const mockRuleOptions = [
    { label: 'Rule Alpha', value: 'rule-alpha' },
    { label: 'Rule Beta', value: 'rule-beta' },
    { label: 'Rule Gamma', value: 'rule-gamma' },
  ];

  const defaultProps = {
    selectedRuleId: null,
    onRuleChange: jest.fn(),
    ruleOptions: mockRuleOptions,
    services: { http: mockHttp },
    'data-test-subj': 'test-rule-filter',
  };

  const user = userEvent.setup({ delay: null });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchRulesSearch.mockResolvedValue([]);
  });

  describe('rendering', () => {
    it('renders the filter button with correct label', () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} />);
      expect(screen.getByText('Rule')).toBeInTheDocument();
    });

    it('applies custom data-test-subj to button', () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} data-test-subj="custom-filter" />);
      expect(screen.getByTestId('custom-filter-button')).toBeInTheDocument();
    });

    it('applies default data-test-subj when not provided', () => {
      const { 'data-test-subj': _, ...propsWithoutDataTestSubj } = defaultProps;
      render(<AlertEpisodesRuleFilter {...propsWithoutDataTestSubj} />);
      expect(screen.getByTestId('ruleFilter-button')).toBeInTheDocument();
    });

    it('shows number of filters based on ruleOptions length', () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} />);
      const button = screen.getByTestId('test-rule-filter-button');
      expect(button).toHaveTextContent('3');
    });

    it('does not show hasActiveFilters when no rule is selected', () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} selectedRuleId={null} />);
      const button = screen.getByTestId('test-rule-filter-button');
      expect(button).not.toHaveClass('euiFilterButton-hasActiveFilters');
    });

    it('shows hasActiveFilters when a rule is selected', () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} selectedRuleId="rule-alpha" />);
      const button = screen.getByTestId('test-rule-filter-button');
      expect(button).toHaveClass('euiFilterButton-hasActiveFilters');
    });

    it('shows numActiveFilters of 1 when a rule is selected', () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} selectedRuleId="rule-alpha" />);
      const button = screen.getByTestId('test-rule-filter-button');
      expect(button.querySelector('.euiNotificationBadge')).toHaveTextContent('1');
    });
  });

  const openPopover = () => user.click(screen.getByTestId('test-rule-filter-button'));

  describe('InlineFilterPopover props', () => {
    it('passes ruleOptions as options', async () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} />);
      await openPopover();
      expect(InlineFilterPopoverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          options: mockRuleOptions,
        }),
        {}
      );
    });

    it('passes selectedRuleId as selectedValues array', async () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} selectedRuleId="rule-beta" />);
      await openPopover();
      expect(InlineFilterPopoverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedValues: ['rule-beta'],
        }),
        {}
      );
    });

    it('passes empty array as selectedValues when no rule is selected', async () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} selectedRuleId={null} />);
      await openPopover();
      expect(InlineFilterPopoverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedValues: [],
        }),
        {}
      );
    });

    it('configures as single select', async () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} />);
      await openPopover();
      expect(InlineFilterPopoverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          singleSelect: true,
        }),
        {}
      );
    });

    it('enables searchable mode', async () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} />);
      await openPopover();
      expect(InlineFilterPopoverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          searchable: true,
        }),
        {}
      );
    });

    it('provides correct search placeholder', async () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} />);
      await openPopover();
      expect(InlineFilterPopoverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          searchPlaceholder: 'Search rules…',
        }),
        {}
      );
    });

    it('provides correct empty message', async () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} />);
      await openPopover();
      expect(InlineFilterPopoverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          emptyMessage: 'No matching rules',
        }),
        {}
      );
    });

    it('passes data-test-subj with popover suffix', async () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} />);
      await openPopover();
      expect(InlineFilterPopoverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'data-test-subj': 'test-rule-filter-popover',
        }),
        {}
      );
    });
  });

  describe('selection callback', () => {
    it('calls onRuleChange with rule id when single value is provided', async () => {
      const onRuleChange = jest.fn();
      render(<AlertEpisodesRuleFilter {...defaultProps} onRuleChange={onRuleChange} />);
      await openPopover();

      const props = InlineFilterPopoverSpy.mock.calls[0][0];
      act(() => {
        props.onSelectionChange(['rule-beta']);
      });

      expect(onRuleChange).toHaveBeenCalledWith('rule-beta');
    });

    it('calls onRuleChange with undefined when empty array is provided', async () => {
      const onRuleChange = jest.fn();
      render(<AlertEpisodesRuleFilter {...defaultProps} onRuleChange={onRuleChange} />);
      await openPopover();

      const props = InlineFilterPopoverSpy.mock.calls[0][0];
      props.onSelectionChange([]);

      expect(onRuleChange).toHaveBeenCalledWith(undefined);
    });

    it('calls onRuleChange with first value when multiple values are provided', async () => {
      const onRuleChange = jest.fn();
      render(<AlertEpisodesRuleFilter {...defaultProps} onRuleChange={onRuleChange} />);
      await openPopover();

      const props = InlineFilterPopoverSpy.mock.calls[0][0];
      props.onSelectionChange(['rule-alpha', 'rule-beta']);

      expect(onRuleChange).toHaveBeenCalledWith('rule-alpha');
    });
  });

  describe('search functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('provides initial empty search value', async () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} />);
      await openPopover();
      expect(InlineFilterPopoverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          searchValue: '',
        }),
        {}
      );
    });

    it('updates search value when onSearchChange is called', async () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} />);
      await openPopover();

      const props = InlineFilterPopoverSpy.mock.calls[0][0];
      act(() => {
        props.onSearchChange!('test');
      });

      expect(InlineFilterPopoverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          searchValue: 'test',
        }),
        {}
      );
    });

    it('filters options locally based on label when search is provided', async () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} />);
      await openPopover();

      const props = InlineFilterPopoverSpy.mock.calls[0][0];
      act(() => {
        props.onSearchChange!('Beta');
      });

      expect(InlineFilterPopoverSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          options: [{ label: 'Rule Beta', value: 'rule-beta' }],
        }),
        {}
      );
    });

    it('filters options case-insensitively', async () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} />);
      await openPopover();

      const props = InlineFilterPopoverSpy.mock.calls[0][0];
      act(() => {
        props.onSearchChange!('beta');
      });

      expect(InlineFilterPopoverSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          options: [{ label: 'Rule Beta', value: 'rule-beta' }],
        }),
        {}
      );
    });

    it('shows all options when search is empty', async () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} />);
      await openPopover();

      const props = InlineFilterPopoverSpy.mock.calls[0][0];
      act(() => {
        props.onSearchChange!('');
      });

      expect(InlineFilterPopoverSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          options: mockRuleOptions,
        }),
        {}
      );
    });

    it('calls fetchRulesSearch after debounce delay', async () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} />);

      await openPopover();

      const props = InlineFilterPopoverSpy.mock.calls[0][0];
      act(() => {
        props.onSearchChange!('Remote');
      });

      expect(mockFetchRulesSearch).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(250);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockFetchRulesSearch).toHaveBeenCalledWith({
        http: mockHttp,
        query: 'Remote',
      });
    });

    it('trims search query before calling API', async () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} />);

      await openPopover();

      const props = InlineFilterPopoverSpy.mock.calls[0][0];
      act(() => {
        props.onSearchChange!('  Remote  ');
      });

      act(() => {
        jest.advanceTimersByTime(250);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockFetchRulesSearch).toHaveBeenCalledWith({
        http: mockHttp,
        query: 'Remote',
      });
    });

    it('does not call API when search is only whitespace', async () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} />);

      await openPopover();

      const props = InlineFilterPopoverSpy.mock.calls[0][0];
      act(() => {
        props.onSearchChange!('   ');
      });

      act(() => {
        jest.advanceTimersByTime(250);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockFetchRulesSearch).not.toHaveBeenCalled();
    });

    it('displays API search results when available', async () => {
      const searchResults = [
        { label: 'Remote Rule Delta', value: 'rule-delta' },
        { label: 'Remote Rule Epsilon', value: 'rule-epsilon' },
      ];
      mockFetchRulesSearch.mockResolvedValue(searchResults);

      render(<AlertEpisodesRuleFilter {...defaultProps} />);

      await openPopover();

      const props = InlineFilterPopoverSpy.mock.calls[0][0];
      act(() => {
        props.onSearchChange!('Remote');
      });

      act(() => {
        jest.advanceTimersByTime(250);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(InlineFilterPopoverSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          options: searchResults,
        }),
        {}
      );
    });

    it('includes selected rule in search results even if not in API response', async () => {
      const searchResults = [
        { label: 'Remote Rule Delta', value: 'rule-delta' },
        { label: 'Remote Rule Epsilon', value: 'rule-epsilon' },
      ];
      mockFetchRulesSearch.mockResolvedValue(searchResults);

      render(<AlertEpisodesRuleFilter {...defaultProps} selectedRuleId="rule-alpha" />);

      await openPopover();

      const props = InlineFilterPopoverSpy.mock.calls[0][0];
      act(() => {
        props.onSearchChange!('Remote');
      });

      act(() => {
        jest.advanceTimersByTime(250);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(InlineFilterPopoverSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          options: [{ label: 'Rule Alpha', value: 'rule-alpha' }, ...searchResults],
        }),
        {}
      );
    });

    it('does not duplicate selected rule if it appears in search results', async () => {
      const searchResults = [
        { label: 'Rule Alpha', value: 'rule-alpha' },
        { label: 'Remote Rule Delta', value: 'rule-delta' },
      ];
      mockFetchRulesSearch.mockResolvedValue(searchResults);

      render(<AlertEpisodesRuleFilter {...defaultProps} selectedRuleId="rule-alpha" />);

      await openPopover();

      const props = InlineFilterPopoverSpy.mock.calls[0][0];
      act(() => {
        props.onSearchChange!('Remote');
      });

      act(() => {
        jest.advanceTimersByTime(250);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(InlineFilterPopoverSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          options: searchResults,
        }),
        {}
      );
    });

    it('falls back to local filtering when API returns empty results', async () => {
      mockFetchRulesSearch.mockResolvedValue([]);

      render(<AlertEpisodesRuleFilter {...defaultProps} />);

      await openPopover();

      const props = InlineFilterPopoverSpy.mock.calls[0][0];
      act(() => {
        props.onSearchChange!('Beta');
      });

      act(() => {
        jest.advanceTimersByTime(250);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(InlineFilterPopoverSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          options: [{ label: 'Rule Beta', value: 'rule-beta' }],
        }),
        {}
      );
    });
  });

  describe('edge cases', () => {
    it('handles undefined selectedRuleId', async () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} selectedRuleId={undefined} />);
      await openPopover();
      expect(InlineFilterPopoverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedValues: [],
        }),
        {}
      );
    });

    it('handles empty ruleOptions array', async () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} ruleOptions={[]} />);
      await openPopover();
      expect(InlineFilterPopoverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          options: [],
        }),
        {}
      );
    });

    it('handles null selectedRuleId', async () => {
      render(<AlertEpisodesRuleFilter {...defaultProps} selectedRuleId={null} />);
      await openPopover();
      expect(InlineFilterPopoverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedValues: [],
        }),
        {}
      );
    });
  });
});
