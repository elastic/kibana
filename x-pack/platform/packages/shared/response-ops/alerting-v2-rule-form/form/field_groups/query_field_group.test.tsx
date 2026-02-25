/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { createFormWrapper } from '../../test_utils';
import { QueryFieldGroup } from './query_field_group';

// Mock CodeEditorField since it requires Monaco which is complex to set up in tests
jest.mock('@kbn/code-editor', () => ({
  CodeEditorField: ({ placeholder, 'aria-label': ariaLabel }: any) => (
    <textarea placeholder={placeholder} aria-label={ariaLabel} data-test-subj="mockedCodeEditor" />
  ),
}));

describe('QueryFieldGroup', () => {
  it('renders the field group with Query title', () => {
    const Wrapper = createFormWrapper();

    render(
      <Wrapper>
        <QueryFieldGroup />
      </Wrapper>
    );

    expect(screen.getByText('Query')).toBeInTheDocument();
  });

  it('renders the Query title as a heading', () => {
    const Wrapper = createFormWrapper();

    render(
      <Wrapper>
        <QueryFieldGroup />
      </Wrapper>
    );

    const heading = screen.getByRole('heading', { name: 'Query' });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe('H3');
  });

  it('renders the ES|QL editor field', () => {
    const Wrapper = createFormWrapper();

    render(
      <Wrapper>
        <QueryFieldGroup />
      </Wrapper>
    );

    expect(screen.getByTestId('mockedCodeEditor')).toBeInTheDocument();
  });

  it('renders the editor with correct placeholder', () => {
    const Wrapper = createFormWrapper();

    render(
      <Wrapper>
        <QueryFieldGroup />
      </Wrapper>
    );

    expect(screen.getByPlaceholderText('FROM logs-* | WHERE ...')).toBeInTheDocument();
  });

  it('renders the editor with accessible aria-label', () => {
    const Wrapper = createFormWrapper();

    render(
      <Wrapper>
        <QueryFieldGroup />
      </Wrapper>
    );

    expect(screen.getByLabelText('ES|QL query editor')).toBeInTheDocument();
  });

  it('renders with pre-filled query value', () => {
    const Wrapper = createFormWrapper({
      evaluation: {
        query: {
          base: 'FROM metrics-* | STATS count()',
        },
      },
    });

    render(
      <Wrapper>
        <QueryFieldGroup />
      </Wrapper>
    );

    // The component should render without errors with pre-filled values
    expect(screen.getByText('Query')).toBeInTheDocument();
  });
});
