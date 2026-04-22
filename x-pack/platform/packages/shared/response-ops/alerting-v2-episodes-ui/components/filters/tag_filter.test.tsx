/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AlertEpisodesTagFilter } from './tag_filter';
import * as inlineFilterPopoverModule from './inline_filter_popover';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import * as useFetchEpisodeTagOptionsModule from '../../hooks/use_fetch_episode_tag_options';
import userEvent from '@testing-library/user-event';

const InlineFilterPopoverSpy = jest.spyOn(inlineFilterPopoverModule, 'InlineFilterPopover');

jest.mock('../../hooks/use_fetch_episode_tag_options', () => ({
  useFetchEpisodeTagOptions: jest.fn(),
}));

const mockUseFetchEpisodeTagOptions = jest.mocked(
  useFetchEpisodeTagOptionsModule.useFetchEpisodeTagOptions
);

describe('TagFilter', () => {
  const defaultProps = {
    selectedTags: null as string[] | null,
    onTagsChange: jest.fn(),
    services: { expressions: {} as ExpressionsStart },
    timeRange: { from: 'now-24h', to: 'now' },
    'data-test-subj': 'test-tag-filter',
  };

  const user = userEvent.setup({ delay: null });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetchEpisodeTagOptions.mockReturnValue({
      data: ['alpha', 'beta'],
      isLoading: false,
    } as unknown as ReturnType<typeof useFetchEpisodeTagOptionsModule.useFetchEpisodeTagOptions>);
  });

  describe('rendering', () => {
    it('renders the filter button with correct label', () => {
      render(<AlertEpisodesTagFilter {...defaultProps} />);
      expect(screen.getByText('Tags')).toBeInTheDocument();
    });

    it('shows hasActiveFilters when tags are selected', () => {
      render(<AlertEpisodesTagFilter {...defaultProps} selectedTags={['alpha']} />);
      const button = screen.getByTestId('test-tag-filter-button');
      expect(button).toHaveClass('euiFilterButton-hasActiveFilters');
    });
  });

  const openPopover = () => user.click(screen.getByTestId('test-tag-filter-button'));

  describe('InlineFilterPopover props', () => {
    it('passes tag options from the hook', async () => {
      render(<AlertEpisodesTagFilter {...defaultProps} />);
      await openPopover();
      expect(InlineFilterPopoverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          options: [
            { label: 'alpha', value: 'alpha' },
            { label: 'beta', value: 'beta' },
          ],
          singleSelect: false,
        }),
        {}
      );
    });

    it('calls onTagsChange when selection changes', async () => {
      const onTagsChange = jest.fn();
      render(<AlertEpisodesTagFilter {...defaultProps} onTagsChange={onTagsChange} />);
      await openPopover();

      const props = InlineFilterPopoverSpy.mock.calls[0][0];
      act(() => {
        props.onSelectionChange(['alpha', 'beta']);
      });

      expect(onTagsChange).toHaveBeenCalledWith(['alpha', 'beta']);
    });

    it('calls onTagsChange with undefined when cleared', async () => {
      const onTagsChange = jest.fn();
      render(<AlertEpisodesTagFilter {...defaultProps} onTagsChange={onTagsChange} />);
      await openPopover();

      const props = InlineFilterPopoverSpy.mock.calls[0][0];
      act(() => {
        props.onSelectionChange([]);
      });

      expect(onTagsChange).toHaveBeenCalledWith(undefined);
    });
  });
});
