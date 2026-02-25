/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AggregateQuery } from '@kbn/es-query';
import { createFormWrapper } from '../../test_utils';
import { QueryFieldGroup } from './query_field_group';

// Mock ESQLLangEditor since it requires complex Kibana services
jest.mock('@kbn/esql/public', () => ({
  ESQLLangEditor: ({
    query,
    onTextLangQueryChange,
    dataTestSubj,
  }: {
    query: AggregateQuery;
    onTextLangQueryChange: (query: AggregateQuery) => void;
    dataTestSubj?: string;
  }) => (
    <div data-test-subj={dataTestSubj}>
      <textarea
        data-test-subj={`${dataTestSubj}-input`}
        value={query.esql}
        onChange={(e) => onTextLangQueryChange({ esql: e.target.value })}
      />
    </div>
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

    expect(screen.getByTestId('ruleV2FormEvaluationQueryField')).toBeInTheDocument();
  });

  it('renders the editor input', () => {
    const Wrapper = createFormWrapper();

    render(
      <Wrapper>
        <QueryFieldGroup />
      </Wrapper>
    );

    expect(screen.getByTestId('ruleV2FormEvaluationQueryField-editor-input')).toBeInTheDocument();
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
    expect(screen.getByTestId('ruleV2FormEvaluationQueryField-editor-input')).toHaveValue(
      'FROM metrics-* | STATS count()'
    );
  });
});
