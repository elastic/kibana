/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { SuggestionsDropdown } from '../shared/suggestions/suggestions_dropdown';
import { useSuggestionsInput } from '../shared/suggestions/use_suggestions_input';
import type { EvaluationDefinition, StatDefinition } from './form_types';
import { createMetricSuggestionsProvider } from './suggestions_provider';
import { EXPRESSION_UNKNOWN_REFERENCE_ERROR } from './translations';

export interface EvaluationExpressionFieldProps {
  readonly index: number;
  readonly currentEvaluation: EvaluationDefinition;
  readonly onChange: (value: string) => void;
  readonly stats: StatDefinition[];
  readonly evaluations: EvaluationDefinition[];
  readonly evaluationInvalidRefs: Map<string, string[]>;
}

export const EvaluationExpressionField: React.FC<EvaluationExpressionFieldProps> = ({
  index,
  currentEvaluation: ev,
  onChange,
  stats,
  evaluations,
  evaluationInvalidRefs,
}) => {
  const provider = useMemo(
    () => createMetricSuggestionsProvider(stats, evaluations, ev.label),
    [stats, evaluations, ev.label]
  );
  const { inputProps, dropdownProps } = useSuggestionsInput({
    value: ev.expression,
    onChange,
    provider,
    listId: `ruleBuilderEvalExpressionSuggestions-${index}`,
  });

  return (
    <EuiFormRow
      label={i18n.translate('xpack.alertingV2.ruleBuilder.evaluations.expressionLabel', {
        defaultMessage: 'Expression',
      })}
      fullWidth
      isInvalid={evaluationInvalidRefs.has(ev.id)}
      error={
        evaluationInvalidRefs.has(ev.id)
          ? EXPRESSION_UNKNOWN_REFERENCE_ERROR(evaluationInvalidRefs.get(ev.id)!)
          : undefined
      }
    >
      <SuggestionsDropdown
        {...dropdownProps}
        testSubjPrefix={`ruleBuilderEvalExpressionSuggestion-${index}`}
        input={
          <EuiFieldText
            {...inputProps}
            fullWidth
            compressed
            placeholder={i18n.translate(
              'xpack.alertingV2.ruleBuilder.evaluations.expressionPlaceholder',
              { defaultMessage: 'e.g. errors / total * 100' }
            )}
            data-test-subj={`ruleBuilderEvalExpression-${index}`}
          />
        }
      />
    </EuiFormRow>
  );
};
