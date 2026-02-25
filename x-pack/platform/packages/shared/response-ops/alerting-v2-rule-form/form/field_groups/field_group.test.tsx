/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FieldGroup } from './field_group';

describe('FieldGroup', () => {
  it('renders the title', () => {
    render(
      <FieldGroup title="Test Section">
        <div>Child content</div>
      </FieldGroup>
    );

    expect(screen.getByText('Test Section')).toBeInTheDocument();
  });

  it('renders the title as an h3 heading', () => {
    render(
      <FieldGroup title="Test Section">
        <div>Child content</div>
      </FieldGroup>
    );

    const heading = screen.getByRole('heading', { name: 'Test Section' });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe('H3');
  });

  it('renders children content', () => {
    render(
      <FieldGroup title="Test Section">
        <div data-test-subj="child-content">Child content</div>
      </FieldGroup>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <FieldGroup title="Test Section">
        <div data-test-subj="child-1">First child</div>
        <div data-test-subj="child-2">Second child</div>
      </FieldGroup>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
  });

  it('renders title with strong styling', () => {
    render(
      <FieldGroup title="Test Section">
        <div>Child content</div>
      </FieldGroup>
    );

    const strong = screen.getByText('Test Section').closest('strong');
    expect(strong).toBeInTheDocument();
  });
});
