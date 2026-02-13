/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateList } from './template_list';
import type { RuleTypeModalProps } from './rule_type_modal';

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

describe('TemplateList', () => {
  const mockTemplates: RuleTypeModalProps['templates'] = [
    {
      id: 'template-1',
      name: 'Template 1',
      tags: ['tag1', 'tag2'],
      ruleTypeId: 'rule-type-1',
      ruleTypeName: 'Rule Type 1',
      producer: 'stackAlerts',
    },
    {
      id: 'template-2',
      name: 'Template 2',
      tags: ['tag3'],
      ruleTypeId: 'rule-type-2',
      ruleTypeName: 'Rule Type 2',
      producer: 'logs',
    },
    {
      id: 'template-3',
      name: 'Template 3',
      tags: [],
      ruleTypeId: 'rule-type-3',
      ruleTypeName: undefined,
      producer: 'apm',
    },
  ];

  const defaultProps = {
    templates: mockTemplates,
    onSelectTemplate: jest.fn(),
    hasMore: false,
    onLoadMore: jest.fn(),
    loadingMore: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all template cards correctly', () => {
    render(<TemplateList {...defaultProps} />);

    expect(screen.getByText('Template 1')).toBeInTheDocument();
    expect(screen.getByText('Template 2')).toBeInTheDocument();
    expect(screen.getByText('Template 3')).toBeInTheDocument();
  });

  it('should render template cards with correct test subjects', () => {
    render(<TemplateList {...defaultProps} />);

    expect(screen.getByTestId('template-1-SelectOption')).toBeInTheDocument();
    expect(screen.getByTestId('template-2-SelectOption')).toBeInTheDocument();
    expect(screen.getByTestId('template-3-SelectOption')).toBeInTheDocument();
  });

  it('should call onSelectTemplate when card is clicked', async () => {
    const onSelectTemplate = jest.fn();
    render(<TemplateList {...defaultProps} onSelectTemplate={onSelectTemplate} />);

    const card = screen.getByTestId('template-1-SelectOption');
    await userEvent.click(card);

    expect(onSelectTemplate).toHaveBeenCalledWith('template-1');
    expect(onSelectTemplate).toHaveBeenCalledTimes(1);
  });

  it('should call onSelectTemplate when Enter key is pressed on card', async () => {
    const onSelectTemplate = jest.fn();
    render(<TemplateList {...defaultProps} onSelectTemplate={onSelectTemplate} />);

    const card = screen.getByTestId('template-1-SelectOption');
    await userEvent.type(card, '{Enter}');

    expect(onSelectTemplate).toHaveBeenCalledWith('template-1');
    expect(onSelectTemplate).toHaveBeenCalledTimes(1);
  });

  it('should call onSelectTemplate when Space key is pressed on card', async () => {
    const onSelectTemplate = jest.fn();
    render(<TemplateList {...defaultProps} onSelectTemplate={onSelectTemplate} />);

    const card = screen.getByTestId('template-1-SelectOption');
    await userEvent.type(card, ' ');

    expect(onSelectTemplate).toHaveBeenCalledWith('template-1');
    expect(onSelectTemplate).toHaveBeenCalledTimes(1);
  });

  it('should render tags correctly', () => {
    render(<TemplateList {...defaultProps} />);

    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.getByText('tag3')).toBeInTheDocument();
  });

  it('should not render tags section when template has no tags', () => {
    const templatesWithoutTags: RuleTypeModalProps['templates'] = [
      {
        id: 'template-no-tags',
        name: 'Template No Tags',
        tags: [],
        ruleTypeId: 'rule-type-1',
      },
    ];

    render(<TemplateList {...defaultProps} templates={templatesWithoutTags} />);

    expect(screen.queryByRole('mark')).not.toBeInTheDocument(); // EuiBadge uses mark element
  });

  it('should show load more trigger when hasMore is true', () => {
    render(<TemplateList {...defaultProps} hasMore={true} />);

    expect(screen.getByTestId('templateList-loadMoreTrigger')).toBeInTheDocument();
  });

  it('should not show load more trigger when hasMore is false', () => {
    render(<TemplateList {...defaultProps} hasMore={false} />);

    expect(screen.queryByTestId('templateList-loadMoreTrigger')).not.toBeInTheDocument();
  });

  it('should call onLoadMore when intersection observer triggers', () => {
    const onLoadMore = jest.fn();
    render(<TemplateList {...defaultProps} hasMore={true} onLoadMore={onLoadMore} />);

    // Get the callback passed to IntersectionObserver
    const observerCallback = mockIntersectionObserver.mock.calls[0][0];

    // Simulate intersection
    observerCallback([{ isIntersecting: true }]);

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('should show loading spinner when loadingMore is true', () => {
    render(<TemplateList {...defaultProps} hasMore={true} loadingMore={true} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render empty list when no templates provided', () => {
    render(<TemplateList {...defaultProps} templates={[]} />);

    expect(screen.queryByTestId(/-SelectOption/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('templateList-loadMoreTrigger')).not.toBeInTheDocument();
  });

  it('should handle templates with all fields populated', () => {
    const fullTemplate: RuleTypeModalProps['templates'] = [
      {
        id: 'full-template',
        name: 'Full Template',
        tags: ['tag1', 'tag2', 'tag3'],
        ruleTypeId: 'rule-type-full',
        ruleTypeName: 'Full Rule Type',
        producer: 'observability',
      },
    ];

    render(<TemplateList {...defaultProps} templates={fullTemplate} />);

    expect(screen.getByText('Full Template')).toBeInTheDocument();
    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.getByText('tag3')).toBeInTheDocument();
  });

  it('should render multiple templates with unique keys', () => {
    render(<TemplateList {...defaultProps} />);

    const cards = screen.getAllByTestId(/-SelectOption/);
    expect(cards).toHaveLength(3);
  });
});
