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
    render(<TagsFilterPopover options={TAGS} value={['production']} onChange={onChange} />);

    fireEvent.click(screen.getByTestId('rulesListTagsFilter'));
    fireEvent.click(screen.getByText('staging'));

    expect(onChange).toHaveBeenCalledWith(['production', 'staging']);
  });

  it('calls onChange without the deselected tag when an active option is clicked', () => {
    const onChange = jest.fn();
    render(
      <TagsFilterPopover options={TAGS} value={['production', 'staging']} onChange={onChange} />
    );

    fireEvent.click(screen.getByTestId('rulesListTagsFilter'));
    fireEvent.click(screen.getByText('production'));

    expect(onChange).toHaveBeenCalledWith(['staging']);
  });

  it('shows active filter count when tags are selected', () => {
    render(
      <TagsFilterPopover options={TAGS} value={['production', 'critical']} onChange={jest.fn()} />
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

    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('renders option data-test-subj attributes', () => {
    render(<TagsFilterPopover {...defaultProps} />);

    fireEvent.click(screen.getByTestId('rulesListTagsFilter'));

    expect(screen.getByTestId('rulesListTagsFilterOption-production')).toBeInTheDocument();
    expect(screen.getByTestId('rulesListTagsFilterOption-staging')).toBeInTheDocument();
    expect(screen.getByTestId('rulesListTagsFilterOption-critical')).toBeInTheDocument();
  });
});
