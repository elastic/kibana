/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TagsFilterPopover } from './tag_filter_popover';

const TAGS = ['production', 'staging', 'critical'];

const defaultProps = {
  options: TAGS,
  value: [] as string[],
  isLoading: false,
  search: '',
  onSearchChange: jest.fn(),
  onChange: jest.fn(),
};

describe('TagsFilterPopover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Tags filter button', () => {
    render(<TagsFilterPopover {...defaultProps} />);

    expect(screen.getByTestId('rulesListTagsFilter')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('displays all tag options when opened', () => {
    render(<TagsFilterPopover {...defaultProps} />);

    fireEvent.click(screen.getByTestId('rulesListTagsFilter'));

    expect(screen.getByText('production')).toBeInTheDocument();
    expect(screen.getByText('staging')).toBeInTheDocument();
    expect(screen.getByText('critical')).toBeInTheDocument();
  });

  it('calls onChange with the selected tag when an option is clicked', () => {
    const onChange = jest.fn();
    render(<TagsFilterPopover {...defaultProps} onChange={onChange} />);

    fireEvent.click(screen.getByTestId('rulesListTagsFilter'));
    fireEvent.click(screen.getByText('production'));

    expect(onChange).toHaveBeenCalledWith(['production']);
  });

  it('calls onChange with multiple tags when multiple options are selected', () => {
    const onChange = jest.fn();
    render(
      <TagsFilterPopover
        options={TAGS}
        value={['production']}
        isLoading={false}
        search=""
        onSearchChange={jest.fn()}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByTestId('rulesListTagsFilter'));
    fireEvent.click(screen.getByText('staging'));

    expect(onChange).toHaveBeenCalledWith(['production', 'staging']);
  });

  it('calls onChange without the deselected tag when an active option is clicked', () => {
    const onChange = jest.fn();
    render(
      <TagsFilterPopover
        options={TAGS}
        value={['production', 'staging']}
        isLoading={false}
        search=""
        onSearchChange={jest.fn()}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByTestId('rulesListTagsFilter'));
    fireEvent.click(screen.getByText('production'));

    expect(onChange).toHaveBeenCalledWith(['staging']);
  });

  it('shows active filter count when tags are selected', () => {
    render(
      <TagsFilterPopover
        options={TAGS}
        value={['production', 'critical']}
        isLoading={false}
        search=""
        onSearchChange={jest.fn()}
        onChange={jest.fn()}
      />
    );

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('does not show active filter count when no tags are selected', () => {
    render(<TagsFilterPopover {...defaultProps} />);

    const button = screen.getByTestId('rulesListTagsFilter');
    expect(button).not.toHaveTextContent('0');
  });

  it('renders a search input for filtering tags', () => {
    render(<TagsFilterPopover {...defaultProps} />);

    fireEvent.click(screen.getByTestId('rulesListTagsFilter'));

    expect(screen.getByTestId('rulesListTagsFilterSearch')).toBeInTheDocument();
  });

  it('renders a controlled search input', () => {
    render(<TagsFilterPopover {...defaultProps} search="prod" />);

    fireEvent.click(screen.getByTestId('rulesListTagsFilter'));

    // The controlled search value should be reflected in the input
    expect(screen.getByTestId('rulesListTagsFilterSearch')).toBeInTheDocument();
  });

  it('renders option data-test-subj attributes', () => {
    render(<TagsFilterPopover {...defaultProps} />);

    fireEvent.click(screen.getByTestId('rulesListTagsFilter'));

    expect(screen.getByTestId('rulesListTagsFilterOption-production')).toBeInTheDocument();
    expect(screen.getByTestId('rulesListTagsFilterOption-staging')).toBeInTheDocument();
    expect(screen.getByTestId('rulesListTagsFilterOption-critical')).toBeInTheDocument();
  });

  it('does not show cap guidance when fewer than 20 tags are returned', () => {
    render(<TagsFilterPopover {...defaultProps} />);

    fireEvent.click(screen.getByTestId('rulesListTagsFilter'));

    expect(screen.queryByTestId('rulesListTagsFilterCapGuidance')).not.toBeInTheDocument();
  });

  it('shows cap guidance when exactly 20 tags are returned', () => {
    const twentyTags = Array.from({ length: 20 }, (_, i) => `tag-${i}`);
    render(
      <TagsFilterPopover
        options={twentyTags}
        value={[]}
        isLoading={false}
        search=""
        onSearchChange={jest.fn()}
        onChange={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('rulesListTagsFilter'));

    expect(screen.getByTestId('rulesListTagsFilterCapGuidance')).toBeInTheDocument();
    expect(screen.getByText(/Showing first 20 most-used/)).toBeInTheDocument();
  });

  it('prepends synthetic checked options for selected tags absent from the current api response', () => {
    const onChange = jest.fn();
    // 'selected-but-absent' is selected but not in the options array
    render(
      <TagsFilterPopover
        options={['production', 'staging']}
        value={['selected-but-absent', 'production']}
        isLoading={false}
        search=""
        onSearchChange={jest.fn()}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByTestId('rulesListTagsFilter'));

    // The absent selected tag should appear as an option
    expect(screen.getByTestId('rulesListTagsFilterOption-selected-but-absent')).toBeInTheDocument();
  });

  it('preserves absent selected tags in subsequent selection changes', () => {
    const onChange = jest.fn();
    render(
      <TagsFilterPopover
        options={['production', 'staging']}
        value={['orphan']}
        isLoading={false}
        search=""
        onSearchChange={jest.fn()}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByTestId('rulesListTagsFilter'));
    // Click 'production' to also select it
    fireEvent.click(screen.getByText('production'));

    // orphan should remain in the selection
    expect(onChange).toHaveBeenCalledWith(expect.arrayContaining(['orphan', 'production']));
  });
});
