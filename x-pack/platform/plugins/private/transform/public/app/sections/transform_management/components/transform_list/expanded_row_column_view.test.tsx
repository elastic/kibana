/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import type { SectionConfig } from './expanded_row_column_view';
import { ExpandedRowColumnView, Section } from './expanded_row_column_view';

const section: SectionConfig = {
  title: 'the-section-title',
  position: 'left',
  items: [
    {
      title: 'the-item-title',
      description: 'the-item-description',
    },
  ],
};

describe('Transform: Job List Expanded Row <ExpandedRowDetailsPane />', () => {
  test('Minimal initialization', () => {
    const { container } = render(<ExpandedRowColumnView sections={[section]} />);

    expect(container.textContent).toContain('the-section-title');
    expect(container.textContent).toContain('the-item-title');
    expect(container.textContent).toContain('the-item-description');
    expect(screen.getAllByTestId('transformExpandedRowColumn')).toHaveLength(1);
    expect(screen.queryByTestId('transformExpandedRowColumnWithDivider')).not.toBeInTheDocument();
  });

  test('renders a divider only when both columns have content', () => {
    render(
      <ExpandedRowColumnView
        sections={[
          section,
          {
            ...section,
            title: 'the-right-section-title',
            position: 'right',
          },
        ]}
      />
    );

    expect(screen.getByTestId('transformExpandedRowColumnWithDivider')).toHaveTextContent(
      'the-right-section-title'
    );
  });

  test('uses the full width when only right-positioned content is available', () => {
    render(
      <ExpandedRowColumnView
        sections={[{ ...section, title: 'the-right-section-title', position: 'right' }]}
      />
    );

    expect(screen.getByTestId('transformExpandedRowColumn')).toHaveTextContent(
      'the-right-section-title'
    );
    expect(screen.queryByTestId('transformExpandedRowColumnWithDivider')).not.toBeInTheDocument();
  });
});

describe('Transform: Job List Expanded Row <Section />', () => {
  test('Minimal initialization', () => {
    const { container } = render(<Section section={section} />);

    expect(container.textContent).toContain('the-section-title');
    expect(container.textContent).toContain('the-item-title');
    expect(container.textContent).toContain('the-item-description');
  });
});
