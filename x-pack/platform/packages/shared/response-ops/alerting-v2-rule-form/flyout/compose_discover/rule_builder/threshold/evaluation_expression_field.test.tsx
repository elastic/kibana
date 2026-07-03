/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EvaluationExpressionField } from './evaluation_expression_field';
import { Aggregation } from './form_types';

const stats = [
  { id: 's1', label: 'count', aggregation: Aggregation.COUNT },
  { id: 's2', label: 'errors', aggregation: Aggregation.COUNT },
];
const evaluations = [{ id: 'e1', label: 'error_rate', expression: 'errors / count' }];

const ControlledField: React.FC<{ ownLabel: string; initialValue?: string }> = ({
  ownLabel,
  initialValue = '',
}) => {
  const [value, setValue] = useState(initialValue);
  return (
    <EvaluationExpressionField
      index={0}
      value={value}
      onChange={setValue}
      ownLabel={ownLabel}
      stats={stats}
      evaluations={evaluations}
    />
  );
};

describe('EvaluationExpressionField', () => {
  it('renders the expression input', () => {
    render(<ControlledField ownLabel="error_rate" />);

    expect(screen.getByTestId('ruleBuilderEvalExpression-0')).toBeInTheDocument();
  });

  it('suggests stat and other evaluation labels while typing, excluding its own label', async () => {
    render(<ControlledField ownLabel="error_rate" />);
    const input = screen.getByTestId('ruleBuilderEvalExpression-0') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'e', selectionStart: 1, selectionEnd: 1 } });

    expect(
      await screen.findByTestId('ruleBuilderEvalExpressionSuggestion-0-option-errors')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('ruleBuilderEvalExpressionSuggestion-0-option-error_rate')
    ).not.toBeInTheDocument();
  });

  it('inserts the clicked suggestion into the expression', async () => {
    render(<ControlledField ownLabel="error_rate" initialValue="" />);
    const input = screen.getByTestId('ruleBuilderEvalExpression-0') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'c', selectionStart: 1, selectionEnd: 1 } });
    fireEvent.click(
      await screen.findByTestId('ruleBuilderEvalExpressionSuggestion-0-option-count')
    );

    expect(input.value).toBe('count');
  });
});
