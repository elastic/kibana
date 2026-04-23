/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { createFormWrapper, createMockServices } from '../../test_utils';
import { ConditionFieldGroup } from './condition_field_group';
import * as useQueryColumnsModule from '../hooks/use_query_columns';
import * as useDataFieldsModule from '../hooks/use_data_fields';

jest.mock('../hooks/use_query_columns');
jest.mock('../hooks/use_data_fields');
jest.mock('../fields/evaluation_query_field', () => ({
  EvaluationQueryField: () => <div data-test-subj="mockEvaluationQueryField" />,
}));

describe('ConditionFieldGroup', () => {
  const mockServices = createMockServices();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useQueryColumnsModule.useQueryColumns).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      isFetching: false,
      status: 'success',
      fetchStatus: 'idle',
    } as ReturnType<typeof useQueryColumnsModule.useQueryColumns>);
    jest.mocked(useDataFieldsModule.useDataFields).mockReturnValue({
      data: {},
      isLoading: false,
    } as ReturnType<typeof useDataFieldsModule.useDataFields>);
  });

  it('renders the ES|QL split legend when includeBase is false (Discover)', () => {
    const Wrapper = createFormWrapper(
      { evaluation: { query: { base: 'FROM x | STATS c = COUNT() BY y | WHERE c > 1' } } },
      mockServices
    );

    render(
      <Wrapper>
        <ConditionFieldGroup includeBase={false} />
      </Wrapper>
    );

    expect(screen.getByTestId('alertingV2EsqlQuerySplitLegend')).toBeInTheDocument();
    expect(screen.getByText('BASE')).toBeInTheDocument();
    expect(screen.getByText('CONDITION')).toBeInTheDocument();
    expect(screen.queryByText('Base query')).not.toBeInTheDocument();
  });

  it('does not render the ES|QL split legend when omitEsqlQuerySplitLegend is true', () => {
    const Wrapper = createFormWrapper(
      { evaluation: { query: { base: 'FROM x | STATS c = COUNT() BY y | WHERE c > 1' } } },
      mockServices
    );

    render(
      <Wrapper>
        <ConditionFieldGroup includeBase={false} omitEsqlQuerySplitLegend />
      </Wrapper>
    );

    expect(screen.queryByTestId('alertingV2EsqlQuerySplitLegend')).not.toBeInTheDocument();
  });

  it('does not render a Rule evaluation accordion in flyout when legend is omitted (plain group)', () => {
    const Wrapper = createFormWrapper(
      { evaluation: { query: { base: 'FROM x | STATS c = COUNT() BY y | WHERE c > 1' } } },
      mockServices,
      { layout: 'flyout' }
    );

    render(
      <Wrapper>
        <ConditionFieldGroup includeBase={false} omitEsqlQuerySplitLegend />
      </Wrapper>
    );

    expect(screen.queryByRole('button', { name: 'Rule evaluation' })).not.toBeInTheDocument();
    expect(screen.getByText('Group Fields')).toBeInTheDocument();
  });

  it('renders the evaluation query field when includeBase is true', () => {
    const Wrapper = createFormWrapper({}, mockServices);

    render(
      <Wrapper>
        <ConditionFieldGroup includeBase={true} />
      </Wrapper>
    );

    expect(screen.queryByTestId('alertingV2EsqlQuerySplitLegend')).not.toBeInTheDocument();
    expect(screen.getByTestId('mockEvaluationQueryField')).toBeInTheDocument();
  });
});
