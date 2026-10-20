/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EvaluationExpressionField } from './evaluation_expression_field';
import type { EvaluationDefinition } from './form_types';
import { Aggregation } from './form_types';

const stats = [
  { id: 's1', label: 'count', aggregation: Aggregation.COUNT },
  { id: 's2', label: 'errors', aggregation: Aggregation.COUNT },
];
const evaluations = [{ id: 'e1', label: 'error_rate', expression: 'errors / count' }];

const ControlledField: React.FC<{ evaluation: EvaluationDefinition }> = ({ evaluation }) => {
  const [value, setValue] = useState(evaluation.expression);
  return (
    <EvaluationExpressionField
      index={0}
      currentEvaluation={{ ...evaluation, expression: value }}
      onChange={setValue}
      stats={stats}
      evaluations={evaluations}
      evaluationInvalidRefs={new Map()}
    />
  );
};

describe('EvaluationExpressionField', () => {
  it('renders the expression input', () => {
    render(<ControlledField evaluation={evaluations[0]} />);

    expect(screen.getByTestId('ruleBuilderEvalExpression-0')).toBeInTheDocument();
  });

  it('suggests stat and other evaluation labels while typing, excluding its own label', async () => {
    render(<ControlledField evaluation={evaluations[0]} />);
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
    render(<ControlledField evaluation={{ label: 'error_rate', expression: '', id: 'e1' }} />);
    const input = screen.getByTestId('ruleBuilderEvalExpression-0') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'c', selectionStart: 1, selectionEnd: 1 } });
    fireEvent.click(
      await screen.findByTestId('ruleBuilderEvalExpressionSuggestion-0-option-count')
    );

    expect(input.value).toBe('count');
  });

  it('marks the field invalid and shows the error text when it has an unknown reference', () => {
    render(
      <EvaluationExpressionField
        index={0}
        currentEvaluation={evaluations[0]}
        onChange={jest.fn()}
        stats={stats}
        evaluations={evaluations}
        evaluationInvalidRefs={new Map([['e1', ['unknown_total']]])}
      />
    );

    expect(screen.getByText('References unknown label: unknown_total')).toBeInTheDocument();
  });
});
