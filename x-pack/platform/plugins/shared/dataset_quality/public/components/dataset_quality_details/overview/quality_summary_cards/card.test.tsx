/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render, fireEvent } from '@testing-library/react';
import { Card } from './card';

describe('Card', () => {
  const defaultProps = {
    title: 'Test Card Title',
    kpiValue: '1,234',
    footer: <div>Test Footer</div>,
  };

  it('renders basic card content correctly', () => {
    render(<Card {...defaultProps} />);

    expect(screen.getByText('Test Card Title')).toBeTruthy();
    expect(screen.getByText('1,234')).toBeTruthy();
    expect(screen.getByText('Test Footer')).toBeTruthy();
  });

  it('renders as a div when onClick is not provided', () => {
    render(<Card {...defaultProps} />);

    const card = screen.getByTestId('datasetQualityDetailsSummaryKpiCard-Test Card Title');
    expect(card.tagName).toBe('DIV');
  });

  it('renders as a button when onClick is provided', () => {
    const onClick = jest.fn();
    render(<Card {...defaultProps} onClick={onClick} />);

    const card = screen.getByTestId('datasetQualityDetailsSummaryKpiCard-Test Card Title');
    expect(card.tagName).toBe('BUTTON');
    expect(card.getAttribute('aria-label')).toBe('Test Card Title');
  });

  it('calls onClick when card is clicked', () => {
    const onClick = jest.fn();
    render(<Card {...defaultProps} onClick={onClick} />);

    const card = screen.getByTestId('datasetQualityDetailsSummaryKpiCard-Test Card Title');
    fireEvent.click(card);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows disabled state when isDisabled is true', () => {
    const onClick = jest.fn();
    render(<Card {...defaultProps} onClick={onClick} isDisabled />);

    const card = screen.getByTestId('datasetQualityDetailsSummaryKpiCard-Test Card Title');
    expect(card.hasAttribute('disabled')).toBe(true);
  });

  it('renders tooltip when titleTooltipContent is provided', () => {
    const tooltipContent = <div>Tooltip content</div>;
    render(<Card {...defaultProps} titleTooltipContent={tooltipContent} />);

    const tooltipIcon = screen.getByText('Info');
    expect(tooltipIcon).toBeTruthy();
    expect(tooltipIcon.closest('[data-euiicon-type="question"]')).toBeTruthy();
  });

  it('shows loading skeleton when isLoading is true', () => {
    render(<Card {...defaultProps} isLoading />);

    // Check for skeleton elements
    const skeletonTitle = document.querySelector('.euiSkeletonTitle');
    const skeletonText = document.querySelector('.euiSkeletonText');

    expect(skeletonTitle).toBeTruthy();
    expect(skeletonText).toBeTruthy();
  });

  it('uses custom dataTestSubjTitle when provided', () => {
    render(<Card {...defaultProps} dataTestSubjTitle="customTestId" />);

    const card = screen.getByTestId('datasetQualityDetailsSummaryKpiCard-customTestId');
    expect(card).toBeTruthy();
  });

  it('renders KPI value with correct test subject', () => {
    render(<Card {...defaultProps} />);

    const kpiValue = screen.getByTestId('datasetQualityDetailsSummaryKpiValue-Test Card Title');
    expect(kpiValue).toBeTruthy();
    expect(kpiValue.textContent).toBe('1,234');
  });

  it('renders complex footer content', () => {
    const complexFooter = (
      <div>
        <span>Complex</span>
        <button>Footer</button>
      </div>
    );
    render(<Card {...defaultProps} footer={complexFooter} />);

    expect(screen.getByText('Complex')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Footer' })).toBeTruthy();
  });

  it('handles empty kpiValue gracefully', () => {
    render(<Card {...defaultProps} kpiValue="" />);

    const kpiValue = screen.getByTestId('datasetQualityDetailsSummaryKpiValue-Test Card Title');
    expect(kpiValue).toBeTruthy();
    expect(kpiValue.textContent).toBe('');
  });

  it('renders title without tooltip when titleTooltipContent is not provided', () => {
    render(<Card {...defaultProps} />);

    expect(screen.getByText('Test Card Title')).toBeTruthy();
    expect(screen.queryByText('Info')).toBe(null);
  });
});
