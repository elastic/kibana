/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AlertEpisodesStatusFilter } from './status_filter';
import * as inlineFilterPopoverModule from './inline_filter_popover';
import userEvent from '@testing-library/user-event';

const InlineFilterPopoverSpy = jest.spyOn(inlineFilterPopoverModule, 'InlineFilterPopover');

describe('StatusFilter', () => {
  const defaultProps = {
    selectedStatus: null,
    onStatusChange: jest.fn(),
    'data-test-subj': 'test-status-filter',
  };

  const user = userEvent.setup({ delay: null });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the filter button with correct label', () => {
      render(<AlertEpisodesStatusFilter {...defaultProps} />);
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('applies custom data-test-subj to button', () => {
      render(<AlertEpisodesStatusFilter {...defaultProps} data-test-subj="custom-filter" />);
      expect(screen.getByTestId('custom-filter-button')).toBeInTheDocument();
    });

    it('applies default data-test-subj when not provided', () => {
      const { 'data-test-subj': _, ...propsWithoutDataTestSubj } = defaultProps;
      render(<AlertEpisodesStatusFilter {...propsWithoutDataTestSubj} />);
      expect(screen.getByTestId('statusFilter-button')).toBeInTheDocument();
    });

    it('shows number of filters as 4 (active, recovered, pending, inactive)', () => {
      render(<AlertEpisodesStatusFilter {...defaultProps} />);
      const button = screen.getByTestId('test-status-filter-button');
      expect(button).toHaveTextContent('4');
    });

    it('does not show hasActiveFilters when no status is selected', () => {
      render(<AlertEpisodesStatusFilter {...defaultProps} selectedStatus={null} />);
      const button = screen.getByTestId('test-status-filter-button');
      expect(button).not.toHaveClass('euiFilterButton-hasActiveFilters');
    });

    it('shows hasActiveFilters when a status is selected', () => {
      render(<AlertEpisodesStatusFilter {...defaultProps} selectedStatus="active" />);
      const button = screen.getByTestId('test-status-filter-button');
      expect(button).toHaveClass('euiFilterButton-hasActiveFilters');
    });

    it('shows numActiveFilters of 1 when a status is selected', () => {
      render(<AlertEpisodesStatusFilter {...defaultProps} selectedStatus="active" />);
      const button = screen.getByTestId('test-status-filter-button');
      expect(button.querySelector('.euiNotificationBadge')).toHaveTextContent('1');
    });
  });

  const openPopover = () => user.click(screen.getByTestId('test-status-filter-button'));

  describe('InlineFilterPopover props', () => {
    it('passes status options with correct values and labels', async () => {
      render(<AlertEpisodesStatusFilter {...defaultProps} />);
      await openPopover();
      expect(InlineFilterPopoverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          options: [
            { label: 'Active', value: 'active' },
            { label: 'Recovering', value: 'recovering' },
            { label: 'Pending', value: 'pending' },
            { label: 'Inactive', value: 'inactive' },
          ],
        }),
        {}
      );
    });

    it('passes selectedStatus as selectedValues array', async () => {
      render(<AlertEpisodesStatusFilter {...defaultProps} selectedStatus="recovering" />);
      await openPopover();
      expect(InlineFilterPopoverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedValues: ['recovering'],
        }),
        {}
      );
    });

    it('passes empty array as selectedValues when no status is selected', async () => {
      render(<AlertEpisodesStatusFilter {...defaultProps} selectedStatus={null} />);
      await openPopover();
      expect(InlineFilterPopoverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedValues: [],
        }),
        {}
      );
    });

    it('configures as single select', async () => {
      render(<AlertEpisodesStatusFilter {...defaultProps} />);
      await openPopover();
      expect(InlineFilterPopoverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          singleSelect: true,
        }),
        {}
      );
    });

    it('provides correct empty message', async () => {
      render(<AlertEpisodesStatusFilter {...defaultProps} />);
      await openPopover();
      expect(InlineFilterPopoverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          emptyMessage: 'No matching statuses',
        }),
        {}
      );
    });

    it('passes data-test-subj with popover suffix', async () => {
      render(<AlertEpisodesStatusFilter {...defaultProps} />);
      await openPopover();
      expect(InlineFilterPopoverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'data-test-subj': 'test-status-filter-popover',
        }),
        {}
      );
    });
  });

  describe('selection callback', () => {
    it('calls onStatusChange with status value when single value is provided', async () => {
      const onStatusChange = jest.fn();
      render(<AlertEpisodesStatusFilter {...defaultProps} onStatusChange={onStatusChange} />);
      await openPopover();

      const props = InlineFilterPopoverSpy.mock.calls[0][0];
      act(() => {
        props.onSelectionChange(['recovering']);
      });

      expect(onStatusChange).toHaveBeenCalledWith('recovering');
    });

    it('calls onStatusChange with undefined when empty array is provided', async () => {
      const onStatusChange = jest.fn();
      render(<AlertEpisodesStatusFilter {...defaultProps} onStatusChange={onStatusChange} />);
      await openPopover();

      const props = InlineFilterPopoverSpy.mock.calls[0][0];
      props.onSelectionChange([]);

      expect(onStatusChange).toHaveBeenCalledWith(undefined);
    });

    it('calls onStatusChange with first value when multiple values are provided', async () => {
      const onStatusChange = jest.fn();
      render(<AlertEpisodesStatusFilter {...defaultProps} onStatusChange={onStatusChange} />);
      await openPopover();

      const props = InlineFilterPopoverSpy.mock.calls[0][0];
      props.onSelectionChange(['active', 'recovering']);

      expect(onStatusChange).toHaveBeenCalledWith('active');
    });
  });

  describe('edge cases', () => {
    it('handles undefined selectedStatus', async () => {
      render(<AlertEpisodesStatusFilter {...defaultProps} selectedStatus={undefined} />);
      await openPopover();
      expect(InlineFilterPopoverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedValues: [],
        }),
        {}
      );
    });

    it('handles null selectedStatus', async () => {
      render(<AlertEpisodesStatusFilter {...defaultProps} selectedStatus={null} />);
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
